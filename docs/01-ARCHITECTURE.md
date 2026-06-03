# 01 — Architecture

## 1. System overview

```
┌─────────────────┐         ┌────────────────────┐         ┌──────────────────┐
│  React (Vite)   │ ──────▶ │  Express API       │ ──────▶ │  MongoDB Atlas    │
│  client/        │  HTTPS  │  server/           │         │                   │
│  Redux Toolkit  │  JSON   │  JWT-protected     │         └──────────────────┘
└────────┬────────┘         └──┬──────┬──────┬───┘
         │                     │      │      │
         │                     ▼      ▼      ▼
         │              ┌──────┐ ┌──────┐ ┌──────┐
         │              │Paystack│ │SendGrid│ │Cloudinary│
         │              └──────┘ └──────┘ └──────┘
         │                     ▲
         └─── Paystack inline ─┘ (webhook returns to /webhook)
```

Single deployable backend, single SPA frontend, three external SaaS dependencies. No microservices — luxury catalog volume doesn't justify the split.

## 2. Key architectural decisions

### 2.1 Membership gate is server-enforced
The frontend hides locked content, but every product/order/request route checks `requireActiveMembership` middleware. Add-on routes additionally check `requireAddon('addon1' | 'addon2')`. A blurred image without server enforcement is not a paywall.

### 2.2 JWT split: short access + long refresh, httpOnly refresh
- Access token: 15 min, sent as `Authorization: Bearer` header, kept in Redux memory only (not localStorage)
- Refresh token: 7 days, httpOnly + secure + sameSite cookie, rotated on every refresh
- Logout invalidates refresh token in a server-side `revokedTokens` set (Mongo TTL collection)

This avoids XSS-stealable tokens while supporting a long session.

### 2.3 Paystack flow: initialize → verify → webhook
For every payment:
1. Frontend hits `/api/v1/<resource>/subscribe` (or equivalent) → server creates pending record + initializes Paystack transaction → returns `authorization_url` or inline reference
2. User pays via Paystack inline widget
3. Frontend hits `/api/v1/<resource>/verify-payment` with reference → server calls Paystack verify API → updates record
4. Paystack webhook arrives asynchronously → server idempotently confirms (already verified or first-time)

Webhook is the source of truth; verify-payment is a UX accelerator. Both must produce the same end state.

### 2.4 Idempotency
Webhook handlers must be idempotent because Paystack retries. Key: `event.id` from Paystack. Store processed event IDs in a small collection with TTL (30 days) — drop duplicates silently.

### 2.5 Special request refund path
A rejected request triggers a refund via Paystack Refund API. Refunds are async (1–7 days in production). The request is marked `rejected` immediately; the user sees "Refund initiated — expect 1–7 business days." A second webhook (`refund.processed`) flips `submissionPayment.status` to `refunded` and sends the second email.

### 2.6 Membership pricing stored in DB, not constants
Although the spec lists ₦20,000 as a constant, real-world admins change pricing. Store in `SiteSettings` (key `pricing.membership.basic`) and read via a cached service. Constants file only holds *fallback defaults* used in seed.

### 2.7 No grace period, but reactivation is free
Expired members lose access immediately. They re-subscribe via the same flow — no penalty, no separate "reactivation" UX. Order history remains visible even when expired (read-only) so they can reference past purchases.

### 2.8 Single luxury inventory = `quantity: 1` default
Most pieces are unique (one Hermès Birkin, one Patek). The model supports `quantity > 1` but UI defaults to 1 and "Sold" hides the buy button. Cart-add for `sold: true` items is server-rejected even if UI bug shows the button.

### 2.9 Image strategy
- Upload → Cloudinary via signed upload preset (server returns signature, browser uploads direct to Cloudinary, server stores returned URL+publicId)
- Server never proxies image bytes — avoids egress cost
- Multiple sizes via Cloudinary transformations in URL (`w_800,f_auto,q_auto`)
- Delete: server calls Cloudinary destroy API on product delete

### 2.10 Email — transactional vs. marketing
- Transactional (order, membership, request emails): SendGrid API direct calls, blocking in request flow (or queued via simple in-memory queue with retry)
- Marketing (campaigns, newsletter): admin composes → server iterates subscriber list → batched send via SendGrid `/mail/send` with personalizations. For >1000 subscribers, recommend SendGrid Marketing Campaigns instead of the API; flag this as a v2 upgrade.

## 3. Security model

| Concern | Mitigation |
|---|---|
| Password storage | bcrypt salt=12 |
| Session hijack | httpOnly refresh cookie + token rotation |
| XSS | helmet CSP, sanitize all rich-text product descriptions on output (DOMPurify), escape user-generated request descriptions |
| CSRF | sameSite=lax cookie + custom header check on state-changing routes |
| MongoDB injection | express-mongo-sanitize globally |
| Mass assignment | Explicit Joi schemas; never `User.findByIdAndUpdate(id, req.body)` |
| Admin bypass | Middleware checks `req.user.role === 'admin'` on every admin route — not just at sidebar render |
| Paystack webhook spoof | Verify `x-paystack-signature` HMAC-SHA512 against raw body |
| File upload abuse | Cloudinary signed uploads with allowed_formats=[png,jpg,jpeg,webp] + max_bytes=5MB enforced at preset |
| Rate limiting | express-rate-limit: auth 5/15min, email-subscribe 3/hr, password-reset 3/hr per IP |
| Enumeration | Forgot-password and email-subscribe always return success regardless of whether the email exists |

## 4. Performance considerations

- Product list endpoint: indexed on `category`, `brand`, `isPublished`, `requiresAddon`, `createdAt`, text index on `title + description + tags`
- Pagination: cursor-based (`?after=<lastId>`) for infinite scroll, offset for admin tables
- Image lazy-load via `loading="lazy"` + Intersection Observer for above-the-fold cards
- Redux Toolkit Query: `keepUnusedDataFor: 300` on product list, invalidate tags on mutations
- Bundle: Vite code-split routes (`React.lazy` for admin section — non-members never download it)

## 5. Deployment topology

- **Backend:** Render/Railway, single web service, env vars from dashboard, MongoDB Atlas (shared M0 → M10 when scaling)
- **Frontend:** Vercel static, `VITE_API_URL` env points to backend
- **Cron jobs:** node-cron in-process for now (membership expiry, renewal reminders). When scaling >1 instance, migrate to a Render cron job or BullMQ + Redis.
- **Logs:** Winston → stdout → Render log stream. For production, add Logtail/Axiom.

## 6. Open questions worth flagging

1. **Tax handling:** spec mentions `tax` on order but doesn't specify Nigerian VAT (7.5%). Assume excluded from displayed price unless told otherwise.
2. **Shipping:** flat rate or by state? Spec says "by state/region or flat rate" — defaulting to flat rate per category (lighter for jewelry, higher for handbags/art) with admin override.
3. **Returns:** model supports `status: 'returned'` but no return workflow is specified. Admin must trigger manually for v1.
4. **Multi-currency:** spec is NGN-only. If international expansion is planned, model needs currency conversion fields now to avoid migration pain later.
5. **Admin login alert:** "send email to admin on admin login" — confirm whether this means *every* admin login (noisy) or only logins from new IPs/devices.
6. **Special request messaging thread:** marked "optional" in spec. For v1, recommend skipping — use admin notes + status-change emails instead.
