# 05 — Implementation Roadmap

Eight phases, each independently shippable to a staging environment. Each phase ends with a working slice — never a "wait for next phase to see anything." Phase order is dependency-driven; do not reorder without re-reading the dependency notes.

Estimates assume one focused engineer at full-time pace. Calendar time = 2–3× because of waiting for keys, design feedback, payment integration sandbox quirks.

---

## Phase 1 — Core Infrastructure

**Goal:** monorepo boots; users can register, verify email, log in, log out, reset password. No membership, no products yet.

**Estimate:** 3–5 days

### Tasks
1. Initialize monorepo with npm workspaces (`/client`, `/server`, `/shared`)
2. Server scaffold: Express + helmet + cors + morgan + winston + dotenv + mongo connection
3. Client scaffold: Vite + React + TS + Tailwind + Redux Toolkit + React Router + react-hot-toast
4. Shared: pricing constants, enums, currency formatter
5. User model + indexes
6. Auth controllers: register, login, refresh, logout, forgot-password, reset-password, verify-email, me
7. Auth middleware: `authenticate`, `requireAdmin`
8. JWT service (access + refresh, rotation, revocation set)
9. Email service skeleton (SendGrid via env, but works with console transport in dev)
10. Email templates: welcome, verify-email, password-reset
11. Frontend: GuestRoute, ProtectedRoute, AdminRoute components
12. Auth pages: Login, Register, ForgotPassword, ResetPassword, VerifyEmail
13. `authApi` RTK Query slice
14. Public Landing skeleton (placeholder hero, no products yet)
15. `.env.example` for both client + server
16. README with setup instructions

### Done means
- `npm run dev` starts both servers
- A new user can register → receive verification email → log in → hit `/auth/me` → log out
- Forgot/reset flow works end-to-end
- Tests: auth integration tests pass

### Dependencies blocked
None. Everything else depends on this.

---

## Phase 2 — Membership

**Goal:** users can purchase Basic membership and/or add-ons via Paystack; access is gated; auto-renewal works; cancellation works.

**Estimate:** 5–7 days

### Tasks
1. Embed membership object in User model
2. MembershipTransaction model + indexes
3. SiteSettings model + seed defaults (pricing constants)
4. PaystackService: `initializeTransaction`, `verifyTransaction`, `createSubscription`, `disableSubscription`, `refundTransaction`
5. Webhook handler with signature verification + idempotency
6. Membership controllers: plans, subscribe, verify-payment, add-on, cancel, webhook, transactions
7. Membership middleware: `requireActiveMembership`, `requireAddon(addonId)`
8. Cron job: daily — find memberships expiring in 3 days → send reminder; in 1 day → send urgent reminder; expired → flip status + send lost-access email
9. Frontend: MembershipPlans, MembershipCheckout, MembershipSuccess pages
10. Frontend: MembershipManage (current plan, add-ons, cancel, billing history)
11. Paystack inline integration via `usePaystack` hook
12. MemberRoute guard wired
13. Email templates: membership-receipt, addon-receipt, renewal-success, renewal-reminder-3d, renewal-reminder-1d, expired, cancelled, payment-failed

### Done means
- A registered user can pay ₦20,000 via Paystack test mode → instantly access /member routes
- Adding an add-on works
- Cancelling sets `autoRenew: false` and `accessUntil = endDate` is shown
- Webhook test events activate/renew correctly
- Cron job dry-runs against a seeded near-expiry user

### Dependencies blocked
Phases 3–7 all require active-membership gating.

### Risks
- **Paystack subscription quirks** — recurring plans in Paystack have nuances (proration on plan change is not automatic). Confirm with Paystack docs before committing to plan-change UX. Fallback: cancel + create new subscription on plan change.
- **Sandbox webhook delivery** — Paystack test webhooks are sometimes flaky. Always pair with the verify-payment endpoint as a UX accelerator.

---

## Phase 3 — Products & Shop

**Goal:** admins can CRUD products; members can browse, filter, search, and view detail.

**Estimate:** 6–8 days

### Tasks
1. Brand, Category, Product models + indexes (incl. text index)
2. Cloudinary config + signed-upload endpoint
3. Product controllers: list (with filters/search/pagination), getBySlug, featured, new-arrivals, flash-sale
4. Wishlist controller (add/remove/list) + middleware
5. Admin product controllers: CRUD, image management, publish, feature
6. Admin brand + category controllers
7. Frontend member: Shop page with ProductFilters/ProductGrid/ProductSort
8. Frontend member: ProductDetail with ProductGallery, related, recently viewed
9. Frontend member: Wishlist page
10. Frontend admin: ProductsList table, ProductEdit form with ImageUploaderAdmin
11. Frontend admin: BrandManager, CategoryManager
12. Seeder: 10 brands, ~15 categories, 20 sample products (placeholder Cloudinary URLs)
13. Search debounce, filter chips, save-search (deferred to backend, store in user)

### Done means
- Seeder runs cleanly
- Member can filter Shop by category+brand+price, paginate, sort
- Member can wishlist/unwishlist a product
- Admin can upload images and create a product
- Add-on-gated products are hidden from non-add-on members

### Dependencies blocked
Phase 4 (cart/orders) requires Product model.

---

## Phase 4 — Commerce

**Goal:** members can add to cart, check out via Paystack, receive order confirmation; admins can manage orders.

**Estimate:** 5–7 days

### Tasks
1. Order model + indexes
2. Cart Redux slice + redux-persist (localStorage)
3. Order controllers: create, verify-payment, list, detail, cancel
4. Server-side cart validation (re-fetches products, checks availability + addons + sold)
5. Snapshot logic on order create (price, title, image copied from product)
6. Admin order controllers: list, detail, update-status, add-note
7. Order status email triggers on each transition
8. Frontend: CartDrawer + CartIconBadge
9. Frontend: Checkout multi-step (address → shipping → payment → review → confirmation)
10. Frontend: OrdersList + OrderDetail (member)
11. Frontend admin: OrdersList table + OrderDetail with status updater
12. Shipping calculation (flat-rate by category for v1; admin can edit in settings)
13. Email templates: order-placed, order-shipped, order-delivered, order-cancelled

### Done means
- Member can complete a full purchase end-to-end in Paystack test mode
- Order appears in their history + admin dashboard
- Admin updates status → email fires → status history records
- Sold items disappear from Shop / show "Sold" overlay
- Order cancellation by member works only in pre-shipped states

### Dependencies blocked
Phase 8 (polish) won't need this, but Phase 6 admin dashboard needs orders to display.

---

## Phase 5 — Special Requests

**Goal:** members can submit a special request with ₦30,000 fee; admins can review, accept (set additional cost), or reject (auto-refund).

**Estimate:** 5–6 days

### Tasks
1. SpecialRequest model + indexes
2. Request number generator (SPR-YYYY-NNNNNN)
3. Request controllers: submit, verify-payment, list, detail, pay-additional
4. Admin controllers: list, detail, update-status, assess-cost
5. Paystack refund integration for rejected requests
6. Webhook handler additions for `refund.processed`
7. Frontend member: RequestsList, RequestCreate (form + image upload), RequestDetail (timeline)
8. Frontend admin: RequestsList, RequestDetail with status manager + assess form
9. Email templates: request-submitted, request-accepted, request-rejected, request-additional-paid, request-completed, request-refunded
10. ReferenceImageUpload component (multi-file, max 5)

### Done means
- Member can submit a request, pay ₦30,000
- Admin can accept with additional cost → member pays → status flows correctly
- Admin can reject → refund initiated → member email sent → second webhook flips status to refunded
- All status changes logged to history with admin user

### Dependencies blocked
Phase 6 admin dashboard shows request stats.

---

## Phase 6 — Admin Dashboard

**Goal:** admin overview, members management, memberships view, email subscribers, content management, settings.

**Estimate:** 6–8 days

### Tasks
1. Admin dashboard stats endpoint (revenue, members, orders, requests aggregations)
2. Revenue chart endpoint (parameterized by range)
3. Recent activity feed endpoint
4. Frontend admin: AdminOverview with KPI cards + 4 charts + activity feed
5. Frontend admin: MembersList + MemberDetail
6. Member management controllers: suspend, membership override, send direct email, soft delete
7. Frontend admin: Memberships (subscriptions list, transactions list, settings form)
8. Membership settings controllers (read/update SiteSettings)
9. EmailSubscriber model + controllers (CRUD, import CSV, export CSV, tag management)
10. Frontend admin: Subscribers table
11. Article model + admin CRUD
12. FAQ model + admin CRUD
13. Banner/announcement settings UI
14. Frontend admin: Settings page (sectioned form)
15. AdminDataTable component (reusable across all admin lists)

### Done means
- Admin Overview loads with real data
- All admin sections are functional (CRUD + filters)
- Member can be suspended, membership manually adjusted
- CSV import/export works for subscribers
- Articles/banners/FAQ/settings editable

### Dependencies blocked
None — this is largely an admin UI layer over data already in place.

---

## Phase 7 — Email List & Marketing

**Goal:** double-opt-in subscription flow; exit-intent popup; admin can send segmented campaigns.

**Estimate:** 4–5 days

### Tasks
1. EmailSubscriber double-opt-in flow (subscribe → confirm token email → confirm → activate)
2. Unsubscribe token + unsubscribe page
3. Frontend: EmailSubscribeForm components (footer, dedicated /join-list page)
4. Frontend: ExitIntentPopup with localStorage cooldown
5. Subscribe trigger on registration (opt-in checkbox) + checkout opt-in + membership signup
6. Auto-tagging based on source + membership status (cron: nightly tag-sync)
7. Campaign model + controllers (compose, schedule, send, list)
8. SendGrid mail/send integration for campaigns with personalizations
9. Frontend admin: CampaignComposer (audience selector, rich-text, preview, send/schedule)
10. Frontend admin: CampaignsList + delivery stats
11. Template editor (admin can edit transactional template HTML, stored in DB)
12. TemplateService that reads from DB with fallback to file templates

### Done means
- Footer subscribe → confirmation email → activates
- Unsubscribe link in every email works
- Exit-intent popup shows once per session
- Admin composes campaign, segments by tag, sends to 100+ test addresses successfully
- Member registration auto-subscribes (if opted) with `source: registration` tag

### Dependencies blocked
None — independent layer.

---

## Phase 8 — Polish

**Goal:** production-ready UX, mobile responsiveness, animations, performance, SEO.

**Estimate:** 4–6 days

### Tasks
1. Framer Motion page transitions + product hover animations + drawer/modal entrances
2. Loading skeletons everywhere (gold shimmer)
3. Empty states for every list (cart, wishlist, orders, requests, search no-results)
4. Error boundaries at route level + global
5. React Helmet Async: title, meta, og:image per page
6. Sitemap generation
7. Mobile responsiveness audit — every page on iPhone SE through iPad Pro widths
8. Accessibility audit — keyboard nav, ARIA labels, focus rings, color contrast (gold-on-black must meet AA)
9. Performance:
   - Image lazy loading + Cloudinary `f_auto,q_auto`
   - Route-based code splitting (admin chunk excluded from member bundles)
   - Bundle analyzer pass; remove unused deps
   - Lighthouse: target 90+ on Performance and Best Practices
10. Cron job for cleanup: revoked tokens TTL, abandoned carts (none — cart is client-side), expired email verification tokens
11. Docker setup: Dockerfile per service, docker-compose for local dev (Mongo + both services)
12. Deployment configs: Render/Railway for backend, Vercel for frontend
13. Production readiness checklist:
    - All Paystack test refs swapped to live (gated by NODE_ENV check)
    - SendGrid sender domain verified
    - Cloudinary preset locked to allowed formats + max size
    - MongoDB Atlas IP allowlist set
    - All admin routes double-check role
    - Rate limits tuned for production load expectations
    - CSP tested (Paystack iframe, Cloudinary domain whitelisted)

### Done means
- App is shippable. Lighthouse green. Mobile-clean. Errors caught. Animations smooth.

### Dependencies blocked
None — final phase.

---

## Cross-cutting workstreams (run in parallel)

These don't belong to a single phase — they accumulate as you build.

### Testing
- **Backend:** Jest + supertest for each controller. Hit ~70% coverage on auth, membership, orders, requests, webhooks. Snapshot Paystack webhook payloads as fixtures.
- **Frontend:** Vitest + React Testing Library. Focus on auth flows, cart logic, route guards, form validation. Visual regression optional via Playwright at the end.
- **E2E:** One happy-path Playwright test per phase added to the phase's "done" check.

### Documentation
- Keep this `/docs` folder updated as decisions change
- OpenAPI / Swagger spec generated from Joi schemas (optional, v2)
- Admin handbook: short markdown explaining workflows (publish a product, reject a request, send a campaign)

### Security review checkpoints
- End of Phase 1: auth audit (JWT handling, password hashing, refresh rotation, rate limits)
- End of Phase 2: payment audit (webhook signature, idempotency, refund flow)
- End of Phase 6: admin audit (no privilege escalation paths, all writes role-checked)
- End of Phase 8: full review (CSP, dependency audit via `npm audit`, secret scan)

---

## Total estimate

Best case: **~38 days** of focused engineering
Realistic: **~50–60 days** including review, design tweaks, third-party debugging
Calendar time at 5d/week, single engineer: **~10–12 weeks**

## What I'd cut for v1 if time pressure is real

1. **Special request messaging thread** (spec flags as optional) — replace with status-change emails
2. **Save Search** functionality — nice-to-have, defer
3. **Campaign delivery stats** (open/click) — requires SendGrid Event Webhook setup, defer
4. **Articles/Press section CMS** — start with hardcoded content, build CMS later
5. **Animations beyond essentials** — Framer Motion is nice but every page transition can ship in v1.1
6. **Light mode admin toggle** — single dark theme is on-brand and faster to ship
7. **Multi-language** — not in spec but flagging: add `lang` field on User/Settings now to avoid migration later

## What I would NOT cut

- Server-side enforcement of membership/addon gates
- Paystack webhook signature verification + idempotency
- Refund flow for rejected requests
- Order item snapshots (price/title at time of purchase)
- Soft delete on members and products (legal/audit reasons)
- Email double opt-in (compliance)
