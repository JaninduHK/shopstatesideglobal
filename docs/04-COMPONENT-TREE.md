# 04 — Frontend Component Tree

## Route map

```
/                                  public:LandingPage
/about                             public:About
/authenticity                      public:Authenticity
/press                             public:Press
/press/:slug                       public:ArticleDetail
/contact                           public:Contact
/membership/plans                  public-or-auth:MembershipPlans
/join-list                         public:EmailSignup
/email/unsubscribe/:token          public:Unsubscribe

/auth/login                        guest:Login
/auth/register                     guest:Register
/auth/verify-email/:token          guest:VerifyEmail
/auth/forgot-password              guest:ForgotPassword
/auth/reset-password/:token        guest:ResetPassword

/member                            member:Home
/member/shop                       member:Shop
/member/shop/:slug                 member:ProductDetail
/member/wishlist                   member:Wishlist
/member/cart                       member:Cart                (slide-in drawer; route is fallback)
/member/checkout                   member:Checkout
/member/orders                     member:OrdersList
/member/orders/:id                 member:OrderDetail
/member/requests                   member:RequestsList
/member/requests/new               member:RequestCreate
/member/requests/:id               member:RequestDetail
/member/profile                    member:Profile
/member/membership                 member:MembershipManage
/member/notifications              member:Notifications

/membership/checkout               auth:MembershipCheckout
/membership/success                auth:MembershipSuccess

/admin                             admin:Overview
/admin/products                    admin:ProductsList
/admin/products/new                admin:ProductEdit (create mode)
/admin/products/:id                admin:ProductEdit
/admin/brands                      admin:Brands
/admin/categories                  admin:Categories
/admin/orders                      admin:OrdersList
/admin/orders/:id                  admin:OrderDetail
/admin/members                     admin:MembersList
/admin/members/:id                 admin:MemberDetail
/admin/memberships                 admin:Memberships
/admin/memberships/settings        admin:MembershipSettings
/admin/special-requests            admin:RequestsList
/admin/special-requests/:id        admin:RequestDetail
/admin/email/subscribers           admin:Subscribers
/admin/email/campaigns             admin:Campaigns
/admin/email/campaigns/new         admin:CampaignCompose
/admin/email/templates             admin:Templates
/admin/content/banners             admin:Banners
/admin/content/articles            admin:Articles
/admin/content/faq                 admin:FAQ
/admin/settings                    admin:Settings
```

## Route guards

```jsx
<Routes>
  {/* Public — anyone */}
  <Route element={<PublicLayout />}>
    <Route path="/" element={<LandingPage />} />
    {/* ... */}
  </Route>

  {/* Guest-only (logged-out only) */}
  <Route element={<GuestRoute />}>
    <Route path="/auth/login" element={<Login />} />
  </Route>

  {/* Auth required, membership optional */}
  <Route element={<ProtectedRoute />}>
    <Route path="/membership/checkout" element={<MembershipCheckout />} />
  </Route>

  {/* Auth + active membership */}
  <Route element={<MemberRoute />}>
    <Route element={<MemberLayout />}>
      <Route path="/member" element={<MemberHome />} />
      <Route path="/member/shop" element={<Shop />} />
      {/* ... */}
    </Route>
  </Route>

  {/* Auth + admin */}
  <Route element={<AdminRoute />}>
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<AdminOverview />} />
      {/* ... lazy loaded via React.lazy */}
    </Route>
  </Route>
</Routes>
```

`MemberRoute` redirects to `/membership/plans` if user lacks active membership.
`AdminRoute` redirects to `/member` if user is not admin.

## Component hierarchy

### `common/` — atoms & molecules
- `Button` — variants: primary (gold), ghost (outlined), text, danger; sizes: sm/md/lg
- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
- `Modal`, `Drawer`, `Popover`, `Tooltip`
- `Badge` — variants: gold, success, error, warning, info, condition (per Product.condition)
- `Loader`, `Skeleton` (gold shimmer)
- `Toast` (react-hot-toast wrapper)
- `Price` — formats kobo → `₦20,000`; shows strikethrough if discounted
- `ImageWithFallback` — lazy + blur-up + Cloudinary URL transformation
- `EmptyState` — icon + message + CTA
- `Pagination`
- `ConfirmDialog`
- `RichTextEditor` (TipTap or Lexical for admin product description)
- `RichTextRenderer` (DOMPurify-sanitized HTML)

### `layout/`
- `PublicLayout` — header (logo + nav: About, Press, Contact, Sign In, Become a Member), footer (email signup + links + social)
- `MemberLayout` — top nav (search bar, cart icon w/ badge, wishlist, notifications, profile menu) + footer
- `AdminLayout` — collapsible sidebar + top bar (notifications, admin profile) + page outlet
- `Navbar`, `Footer`, `Sidebar`, `MobileMenu`
- `MembershipBanner` (renewal reminders, addon upsells)
- `AnnouncementBar` (admin-controlled)

### `product/`
- `ProductCard` — image, brand, title, price, condition badge, wishlist heart, addon-lock overlay
- `ProductGrid` — wraps ProductCard, handles skeleton states
- `ProductGallery` — main image + thumbnails, zoom, swipe on mobile
- `ProductFilters` — sidebar with category/brand/price/condition/size/color filters
- `ProductFilterChips` — active filter pills, removable
- `ProductSort` — dropdown
- `ProductSearchBar`
- `ProductQuickView` — modal on grid hover (optional, v2)
- `RelatedProducts` — carousel
- `RecentlyViewed`
- `AddonLockOverlay` — full-card overlay with upgrade CTA

### `auth/`
- `LoginForm`, `RegisterForm`
- `ForgotPasswordForm`, `ResetPasswordForm`
- `MembershipGate` — blurred preview wrapper for non-members
- `EmailVerificationNotice`

### `membership/`
- `PricingCard` — plan, price, benefits, CTA
- `AddOnCard` — add-on tease + price
- `MembershipBenefits` — bullet list with icons
- `MembershipStatusCard` — current plan, expiry, auto-renew toggle
- `BillingHistoryTable`
- `PaystackButton` — wraps Paystack inline widget

### `cart/`
- `CartDrawer` — slide-in panel
- `CartItem` — image, title, price, qty, remove
- `CartSummary` — subtotal, shipping, total
- `CartIconBadge`

### `checkout/`
- `CheckoutSteps` — step indicator (Address → Shipping → Payment → Review)
- `AddressForm`, `AddressList` (saved addresses)
- `ShippingMethodSelector`
- `OrderSummary` — sticky sidebar
- `PaymentSection` — Paystack inline widget

### `special-request/`
- `RequestForm` — title, description, budget, category, brand, reference images upload, notes
- `RequestStatusTimeline` — visual stepper with current state
- `RequestStatusBadge`
- `RequestPaymentCTA` — appears when status = `awaiting_additional_payment`
- `RequestRefundNotice` — appears when status = `rejected`
- `RequestCard` — list item
- `ReferenceImageUpload` — multi-file, drag-drop, preview, remove

### `notification/`
- `NotificationBell` — icon + unread count
- `NotificationDropdown` — recent 5 + view-all link
- `NotificationList`

### `email/`
- `EmailSubscribeForm` — minimal email+name+submit
- `ExitIntentPopup` — triggered by `mouseleave` on document at top viewport edge (desktop) or scroll-up (mobile); cooldown via localStorage
- `UnsubscribeCard`

### `admin/`
- `AdminSidebar`, `AdminTopBar`
- `KPICard`, `StatChange` (up/down arrow with %)
- `RevenueChart`, `MembershipGrowthChart`, `OrdersStatusChart`, `CategoryRevenueChart` (Recharts)
- `RecentActivityFeed`
- `AdminDataTable` — generic table with sort/filter/pagination/bulk-select
- `BulkActionBar`
- `ProductFormAdmin` — full create/edit form
- `ImageUploaderAdmin` — drag-drop, reorder, set primary, Cloudinary signed upload
- `BrandManager`, `CategoryManager` (drag-to-reorder tree for categories)
- `OrderStatusUpdater` — dropdown + tracking input + notify toggle
- `MemberSuspendDialog`, `MemberMembershipOverrideForm`
- `RequestStatusManager` — dropdown with conditional fields (assess cost for accepted, confirmation for rejected)
- `RequestRefundConfirmDialog`
- `CampaignComposer` — audience selector + rich-text editor + preview + send/schedule
- `TemplateEditor` — HTML editor with token autocomplete
- `BannerEditor`, `AnnouncementEditor`
- `ArticleEditor` (rich text)
- `FAQEditor` (grouped sortable list)
- `SettingsForm` (sectioned, per category)

## Redux state shape

```ts
RootState = {
  auth: {
    user: User | null,
    accessToken: string | null,
    isAuthenticating: boolean,
    error: string | null,
  },
  cart: {
    items: { productId, title, image, price, quantity }[],
    persistedAt: Date,
  },
  ui: {
    cartDrawerOpen: boolean,
    mobileMenuOpen: boolean,
    activeModal: ModalId | null,
    exitIntentShown: boolean,
  },
  notifications: {
    items: Notification[],
    unreadCount: number,
  },
  // RTK Query slices (auto-managed):
  productsApi, ordersApi, membershipApi, requestsApi, adminApi, emailApi
}
```

`cart` persists to localStorage via `redux-persist` (only `cart` slice — never `auth`).

## Hooks

```
useAuth()              → { user, isAuthenticated, isAdmin, login, logout, register }
useMembership()        → { status, plan, addOns, hasAddon, isActive, daysRemaining }
useCart()              → { items, count, subtotal, add, remove, updateQty, clear }
useNotifications()     → { items, unreadCount, markRead, markAllRead }
useExitIntent()        → triggers callback when user shows exit signal
useDebounce(value, ms) → for search inputs
usePaystack()          → { pay({reference, amount, email, onSuccess, onClose}) }
useCloudinaryUpload()  → { upload(file, {folder, onProgress}) }
useToast()             → react-hot-toast wrapper with themed styles
```

## Lazy-loading strategy

- `admin/*` routes are `React.lazy()` — non-members never download the 200KB+ admin bundle
- `product/ProductDetail` lazy-loads the image gallery and rich-text renderer
- `RichTextEditor` (TipTap/Lexical) is lazy-loaded — only admins editing products need it
- Recharts is lazy-loaded inside admin dashboard chart components

## Theming

- Tailwind config extends with the design tokens from spec §"Frontend Design System"
- CSS variables on `:root` for the same tokens (used by non-Tailwind components and animations)
- One global theme — no light mode in v1 (the brand is dark editorial; light mode dilutes it). Admin gets a "high-contrast" toggle as an accessibility setting, not a true light theme.
