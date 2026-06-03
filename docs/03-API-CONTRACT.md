# 03 — API Contract

Base URL: `/api/v1`
Auth header: `Authorization: Bearer <accessToken>` (refresh cookie auto-attached)
Content-Type: `application/json`
Currency: NGN, stored as **integer kobo** server-side (₦20,000 = `2000000`), formatted as ₦ at presentation layer.

## Response envelope

```jsonc
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "total": 248 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Email required", "details": [...] } }
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYMENT_FAILED`, `MEMBERSHIP_REQUIRED`, `ADDON_REQUIRED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## Auth — `/auth`

### POST `/auth/register`
**Body:** `{ firstName, lastName, email, password, phone?, subscribeEmail?: boolean }`
**Returns:** `{ user: { id, email, firstName }, message: "Verification email sent" }` (201)
**Side effects:** sends verification email, creates EmailSubscriber if opted in (with pending confirmation).

### POST `/auth/verify-email/:token`
**Returns:** `{ verified: true }`
**Then:** frontend redirects to `/membership/plans`.

### POST `/auth/login`
**Body:** `{ email, password }`
**Returns:** `{ user, accessToken }` + sets `refreshToken` httpOnly cookie. (200)
**Rate-limited:** 5/15min per IP.

### POST `/auth/refresh-token`
**Cookie:** `refreshToken`
**Returns:** `{ accessToken }` + rotates refresh cookie.

### POST `/auth/logout`
Clears refresh cookie + revokes token server-side.

### POST `/auth/forgot-password`
**Body:** `{ email }`
**Returns:** `{ success: true }` always (no enumeration). Sends reset email if email exists.

### POST `/auth/reset-password/:token`
**Body:** `{ password }`

### GET `/auth/me`
**Returns:** full user object minus password/tokens, including membership status.

---

## Membership — `/membership`

### GET `/membership/plans` (public)
**Returns:**
```json
{
  "plans": [
    { "id": "basic", "name": "Basic", "monthly": 2000000, "benefits": [...] },
    { "id": "addon1", "name": "First Look", "monthly": 2000000, "benefits": [...] },
    { "id": "addon2", "name": "Vault", "monthly": 2000000, "benefits": [...] }
  ]
}
```

### POST `/membership/subscribe` (auth required)
**Body:** `{ plan: 'basic', addOns: ['addon1'?] }`
**Returns:** `{ paystackReference, authorizationUrl, accessCode }` — frontend invokes Paystack inline with `accessCode`.

### POST `/membership/verify-payment` (auth required)
**Body:** `{ reference }`
**Returns:** `{ membership: { status: 'active', plan, addOns, endDate } }`
**Side effect:** sends receipt email.

### POST `/membership/add-on` (auth, active membership required)
**Body:** `{ addOn: 'addon1' | 'addon2' }`
**Returns:** Paystack init payload.

### POST `/membership/cancel` (auth)
**Body:** `{}`
**Returns:** `{ cancelledAt, accessUntil: endDate }`

### GET `/membership/transactions` (auth)
**Returns:** paginated `MembershipTransaction[]` for current user.

### POST `/membership/paystack-webhook` (no auth, signature-verified)
**Headers:** `x-paystack-signature`
**Body:** raw Paystack event
**Handles:**
- `charge.success` → activate or renew
- `subscription.disable` → `autoRenew = false`
- `subscription.not_renew` → on next expiry, `status = expired`
- `invoice.payment_failed` → notify, mark expired
- `refund.processed` → flip special-request payment to `refunded`
**Returns:** `200` always (Paystack expects 200 even for ignored events; log unknown types).

---

## Products — `/products` (auth + active membership)

### GET `/products`
**Query:** `?category=&brand=&condition=&priceMin=&priceMax=&size=&color=&sort=newest&page=1&limit=24&q=&addon=`
**Returns:** `{ products: [...], meta: { total, page, pages } }`
**Filter logic:**
- `addon=addon1` returns only addon1-gated products (requires user has addon1 — else 403 `ADDON_REQUIRED`)
- Default: only `requiresAddon: 'none'` and user's add-ons

### GET `/products/:slug`
**Returns:** full product + related (4 from same category/brand)
**Side effect:** increments `views` (best-effort, async).
**403 if** product requires an add-on the user lacks.

### GET `/products/featured`, `/products/new-arrivals`, `/products/flash-sale`
**Returns:** curated lists.

### GET `/products/search?q=`
Text search across title/brand/tags. Returns ranked results.

---

## Cart — *(client-only Redux + localStorage)*

Cart is **not** persisted server-side. Items are validated on order create. Rationale: cart is high-churn, low-value to sync; saving server-side adds complexity without UX gain.

---

## Orders — `/orders` (auth + active membership)

### POST `/orders`
**Body:**
```json
{
  "items": [{ "productId": "...", "quantity": 1 }],
  "shippingAddressId": "...",
  "customerNote": "..."
}
```
**Returns:** `{ order, paystackReference, accessCode }` — order created in `pending_payment`.
**Server validates:** every product exists, `isPublished`, `!sold`, user has required add-ons.

### POST `/orders/verify-payment`
**Body:** `{ reference }`
**Returns:** confirmed order.
**Side effects:** mark items `sold: true`, send confirmation email, decrement related stats.

### GET `/orders`
**Query:** `?page=&status=`
**Returns:** user's orders.

### GET `/orders/:id`
Returns order detail (403 if not user's own).

### POST `/orders/:id/cancel`
Only if status in `[pending_payment, confirmed, processing]`.
**Side effect:** unmark `sold`, refund if paid (async).

---

## Wishlist — `/wishlist`

### GET `/wishlist` → product list
### POST `/wishlist/:productId` → add
### DELETE `/wishlist/:productId` → remove

---

## Special Requests — `/special-requests`

### POST `/special-requests`
**Body:**
```json
{
  "title": "Hermès Birkin 30 Togo Etoupe",
  "description": "...",
  "budget": 1500000000,
  "category": "handbags",
  "brand": "Hermès",
  "referenceImages": [{ "url": "...", "publicId": "..." }],
  "additionalNotes": "..."
}
```
**Returns:** `{ request, paystackReference, accessCode }` — request created in `pending_payment`, fee = ₦30,000.

### POST `/special-requests/verify-payment`
**Body:** `{ reference }`
**Returns:** request now `submitted`.

### GET `/special-requests`
User's requests.

### GET `/special-requests/:id`
Detail with status history.

### POST `/special-requests/:id/pay-additional`
**Available when:** status = `awaiting_additional_payment`
**Returns:** Paystack init payload for `additionalCostAssessed`.

### POST `/special-requests/:id/pay-additional/verify`
**Body:** `{ reference }`
**Side effect:** status → `sourcing`, admin notified.

---

## Email — `/email`

### POST `/email/subscribe` (public, rate-limited)
**Body:** `{ email, firstName?, source }`
**Returns:** `{ success: true }` always.
**Side effect:** if new, create EmailSubscriber with `isActive: false` + send double-opt-in email.

### GET `/email/confirm/:token` (browser link)
Sets `isActive: true`. Returns HTML page (not JSON — direct link click).

### GET `/email/unsubscribe/:token` (browser link)
Sets `isActive: false`. Returns HTML confirmation page with re-subscribe option.

---

## Admin — `/admin` (auth + role=admin)

All admin routes return same envelope. Listed condensed; request bodies match the model schemas with admin-only fields exposed.

### Dashboard
- `GET /admin/dashboard/stats` → KPI numbers
- `GET /admin/dashboard/revenue-chart?range=7d|30d|12m`
- `GET /admin/dashboard/recent-activity?limit=20`

### Products
- `GET /admin/products` — admin sees all (including unpublished, sold), filters incl. `status=draft`
- `POST /admin/products` — create (validates Cloudinary publicIds belong to this admin's upload signature)
- `GET /admin/products/:id`
- `PUT /admin/products/:id`
- `DELETE /admin/products/:id` — soft delete + Cloudinary cleanup
- `POST /admin/products/:id/images` — body: `{ images: [{url, publicId, alt}] }`
- `DELETE /admin/products/:id/images/:imageId`
- `PATCH /admin/products/:id/publish` — body: `{ isPublished: bool }`
- `PATCH /admin/products/:id/feature`
- `POST /admin/products/upload-signature` — returns Cloudinary signed-upload params

### Brands / Categories
Standard CRUD: `GET/POST /admin/brands`, `PUT/DELETE /admin/brands/:id`. Same for categories.

### Orders
- `GET /admin/orders` — filterable
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status` — body: `{ status, trackingNumber?, courierService?, note?, notifyCustomer: true }`
- `POST /admin/orders/:id/note`

### Members
- `GET /admin/members` — filter by plan/status
- `GET /admin/members/:id`
- `PATCH /admin/members/:id/suspend` — body: `{ suspended: bool, reason? }`
- `PATCH /admin/members/:id/membership` — manual override; body: `{ plan?, addOns?, endDate? }`
- `DELETE /admin/members/:id` — soft delete
- `POST /admin/members/:id/email` — body: `{ subject, body }` — direct email

### Memberships
- `GET /admin/memberships/subscriptions`
- `GET /admin/memberships/transactions`
- `PATCH /admin/memberships/settings` — updates SiteSettings keys

### Special Requests
- `GET /admin/special-requests`
- `GET /admin/special-requests/:id`
- `PATCH /admin/special-requests/:id/status` — body: `{ status, note?, notifyCustomer: true }`
  - Status `accepted` requires `additionalCostAssessed` + `additionalCostNote` to be set first via `/assess`
  - Status `rejected` triggers Paystack refund automatically
- `PATCH /admin/special-requests/:id/assess` — body: `{ additionalCostAssessed, additionalCostNote }`
- `POST /admin/special-requests/:id/note`

### Email
- `GET /admin/email/subscribers` — filter/search
- `POST /admin/email/subscribers/import` — CSV (multipart)
- `GET /admin/email/subscribers/export` — CSV download
- `POST /admin/email/campaign` — body: `{ name, subject, html, audience: { all|members|tag, value? }, scheduleAt? }`
- `GET /admin/email/campaigns`
- `GET /admin/email/templates`
- `PUT /admin/email/templates/:id` — edit template HTML

### Content
- `GET/PUT /admin/content/banners`
- `GET/PUT /admin/content/announcement`
- `GET/POST/PUT/DELETE /admin/content/articles`
- `GET/POST/PUT/DELETE /admin/content/faq`

### Settings
- `GET /admin/settings`
- `PUT /admin/settings` — body: `{ key, value }[]`

---

## Middleware composition examples

```js
// Member-only product
router.get('/products/:slug',
  authenticate,
  requireActiveMembership,
  requireAddonIfNeeded,        // reads product, checks user.membership.addOns
  getProductBySlug
);

// Admin-only
router.patch('/admin/orders/:id/status',
  authenticate,
  requireAdmin,
  validateBody(updateOrderStatusSchema),
  updateOrderStatus
);

// Webhook
router.post('/membership/paystack-webhook',
  rawBodyParser,               // needed for HMAC
  verifyPaystackSignature,
  handlePaystackEvent
);
```

## Pagination defaults

- Member-facing lists: `limit=24`, max `100`
- Admin tables: `limit=50`, max `200`
- Cursor pagination for infinite scroll (`?after=<id>`), offset for tables

## File upload pattern

```
1. Client: POST /admin/products/upload-signature
   → returns { signature, timestamp, apiKey, cloudName, folder, eager }
2. Client: POST to Cloudinary with form-data + above params
   → Cloudinary returns { secure_url, public_id }
3. Client: POST /admin/products/:id/images with { url, publicId }
   → server stores reference
```

Server never touches the image bytes. Cloudinary preset enforces format and size.
