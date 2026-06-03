# 02 — Entity Relationship Diagram

## Mermaid ERD

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER ||--o{ SPECIAL_REQUEST : submits
    USER ||--o{ MEMBERSHIP_TRANSACTION : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o| EMAIL_SUBSCRIBER : "linked to (optional)"
    USER ||--o{ PRODUCT : "wishlists (M2M)"

    PRODUCT }o--|| BRAND : "belongs to"
    PRODUCT }o--|| CATEGORY : "belongs to"
    PRODUCT ||--o{ ORDER_ITEM : "appears in"

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER ||--|| ADDRESS : "ships to (embedded)"
    ORDER ||--o{ STATUS_HISTORY : "tracked by (embedded)"

    SPECIAL_REQUEST ||--o{ STATUS_HISTORY : "tracked by (embedded)"
    SPECIAL_REQUEST ||--o| USER : "reviewed by (admin)"

    CATEGORY ||--o{ CATEGORY : "parent of"

    SITE_SETTINGS ||--o| USER : "updated by"

    USER {
        ObjectId _id PK
        string email UK
        string password "bcrypt hash"
        string role "user | admin"
        object membership "embedded: status, plan, addOns[], endDate, autoRenew, paystackCodes"
        object emailList "embedded: subscribed, token"
        array addresses "embedded[]"
        array wishlist "ObjectId[] -> Product"
        Date createdAt
    }

    PRODUCT {
        ObjectId _id PK
        string slug UK
        string sku UK
        ObjectId brand FK
        string category "enum"
        number price "NGN"
        string condition "enum"
        array images "embedded[]"
        object authenticationDetails "embedded"
        boolean isPublished
        string requiresAddon "none | addon1 | addon2"
        boolean sold
    }

    BRAND {
        ObjectId _id PK
        string name UK
        string slug UK
        string tier "ultra-luxury | luxury | premium"
    }

    CATEGORY {
        ObjectId _id PK
        string slug UK
        ObjectId parent FK "self-ref"
        number sortOrder
    }

    ORDER {
        ObjectId _id PK
        string orderNumber UK "LUX-YYYY-NNNNNN"
        ObjectId user FK
        array items "embedded order_item[]"
        object shippingAddress "embedded"
        number total "NGN"
        object payment "embedded: status, paystackRef, paidAt"
        string status "enum"
        array statusHistory "embedded[]"
    }

    ORDER_ITEM {
        ObjectId product FK
        string title "snapshot"
        number price "snapshot NGN"
        string image "snapshot URL"
        number quantity
    }

    MEMBERSHIP_TRANSACTION {
        ObjectId _id PK
        ObjectId user FK
        string type "new | renewal | addon | upgrade | cancellation"
        number amount "NGN"
        string paystackReference UK
        string status
        mixed metadata
    }

    SPECIAL_REQUEST {
        ObjectId _id PK
        string requestNumber UK "SPR-YYYY-NNNNNN"
        ObjectId user FK
        string title
        number budget "NGN"
        array referenceImages "embedded[]"
        string status "11-state enum"
        number submissionFee "30000 NGN"
        object submissionPayment "embedded"
        number additionalCostAssessed
        object additionalPayment "embedded"
        ObjectId reviewedBy FK "-> User (admin)"
    }

    EMAIL_SUBSCRIBER {
        ObjectId _id PK
        string email UK
        boolean isActive
        string source "footer | popup | checkout | registration | membership"
        array tags
        ObjectId user FK "nullable -> User"
        string unsubscribeToken UK
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId user FK
        string type
        string message
        boolean isRead
    }

    SITE_SETTINGS {
        ObjectId _id PK
        string key UK
        mixed value
        ObjectId updatedBy FK
    }

    STATUS_HISTORY {
        string status
        Date changedAt
        ObjectId changedBy FK
        string note
    }

    ADDRESS {
        string label
        string fullName
        string phone
        string line1
        string line2
        string city
        string state
        string country
        string postalCode
        boolean isDefault
    }
```

## Relationship notes

### One-to-many (typical)
- `User → Order` — a user has many orders
- `User → SpecialRequest` — a user submits many requests
- `User → MembershipTransaction` — billing history
- `Brand → Product`, `Category → Product`

### Many-to-many
- `User ↔ Product` (wishlist): stored as `user.wishlist[ObjectId<Product>]` — denormalised on the user side. For large wishlists, may need a separate `Wishlist` collection, but unlikely at this scale.

### Self-referential
- `Category.parent → Category._id` (nested categories: Women → Bags → Top-handle)

### Embedded vs. referenced — the decision rule
- **Embedded** when child has no independent lifecycle and is bounded:
  - `Order.items` (snapshot of product at purchase time — must not change if product is edited later)
  - `Order.statusHistory`, `SpecialRequest.statusHistory`
  - `User.addresses`, `User.wishlist`
  - `Product.images`, `Product.authenticationDetails`
- **Referenced** when child is queried independently or grows unbounded:
  - `Product.brand`, `Product.category`
  - `Order.user`, `SpecialRequest.user`
  - `MembershipTransaction.user`

### Critical snapshot pattern
`Order.items[].price` and `Order.items[].title` are **snapshots at purchase time**, NOT live joins to Product. If a product price changes after sale, the order total must still reflect what the customer paid. Same for `Order.shippingAddress` — copy from User.addresses, don't reference.

## Required indexes

```js
// User
{ email: 1 }                                       // unique, login
{ 'membership.endDate': 1, 'membership.status': 1 } // cron expiry sweep
{ emailVerifyToken: 1 }, { passwordResetToken: 1 } // sparse

// Product
{ slug: 1 }                                        // unique, detail page
{ sku: 1 }                                         // unique
{ category: 1, isPublished: 1, createdAt: -1 }     // browse + filter
{ brand: 1, isPublished: 1 }
{ requiresAddon: 1, isPublished: 1 }
{ isFeatured: 1, isPublished: 1 }
{ title: 'text', description: 'text', tags: 'text' } // search

// Order
{ orderNumber: 1 }                                 // unique
{ user: 1, createdAt: -1 }                         // user's order history
{ status: 1, createdAt: -1 }                       // admin filter
{ 'payment.paystackReference': 1 }                 // webhook lookup

// SpecialRequest
{ requestNumber: 1 }                               // unique
{ user: 1, createdAt: -1 }
{ status: 1 }

// MembershipTransaction
{ user: 1, createdAt: -1 }
{ paystackReference: 1 }                           // unique, webhook lookup

// EmailSubscriber
{ email: 1 }                                       // unique
{ unsubscribeToken: 1 }
{ tags: 1, isActive: 1 }                           // campaign segmentation

// SiteSettings
{ key: 1 }                                         // unique
```

## Schema validation strategy

Use Mongoose schemas as the canonical source. Joi/Zod validators at the API boundary mirror the model but apply *input* rules (required-on-create vs. optional-on-update). Never trust the model alone — Mongoose `unique: true` is a hint, not a constraint without an index sync.
