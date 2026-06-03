export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const MEMBERSHIP_STATUS = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

export const MEMBERSHIP_PLAN = Object.freeze({
  BASIC: 'basic',
  BASIC_ADDON1: 'basic_addon1',
  BASIC_ADDON2: 'basic_addon2',
  FULL: 'full',
});

export const ADDON = Object.freeze({
  ADDON1: 'addon1',
  ADDON2: 'addon2',
});

export const ADDON_GATE = Object.freeze({
  NONE: 'none',
  ADDON1: 'addon1',
  ADDON2: 'addon2',
});

export const PRODUCT_CATEGORY = Object.freeze({
  WOMEN: 'women',
  MEN: 'men',
  JEWELRY: 'jewelry',
  WATCHES: 'watches',
  HANDBAGS: 'handbags',
  SHOES: 'shoes',
  HOME: 'home',
  ART: 'art',
  KIDS: 'kids',
});

export const PRODUCT_CONDITION = Object.freeze({
  NEW_WITH_TAGS: 'new_with_tags',
  EXCELLENT: 'excellent',
  VERY_GOOD: 'very_good',
  GOOD: 'good',
  FAIR: 'fair',
});

export const BRAND_TIER = Object.freeze({
  ULTRA_LUXURY: 'ultra-luxury',
  LUXURY: 'luxury',
  PREMIUM: 'premium',
});

export const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const PAYMENT_METHOD = Object.freeze({
  PAYSTACK: 'paystack',
  BANK_TRANSFER: 'bank_transfer',
});

export const SPECIAL_REQUEST_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  AWAITING_ADDITIONAL_PAYMENT: 'awaiting_additional_payment',
  ADDITIONAL_PAID: 'additional_paid',
  SOURCING: 'sourcing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const MEMBERSHIP_TX_TYPE = Object.freeze({
  NEW: 'new',
  RENEWAL: 'renewal',
  ADDON: 'addon',
  UPGRADE: 'upgrade',
  CANCELLATION: 'cancellation',
});

export const EMAIL_SOURCE = Object.freeze({
  FOOTER_FORM: 'footer_form',
  POPUP: 'popup',
  CHECKOUT: 'checkout',
  REGISTRATION: 'registration',
  MEMBERSHIP: 'membership',
});
