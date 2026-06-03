import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  ROLES,
  MEMBERSHIP_STATUS,
  MEMBERSHIP_PLAN,
  ADDON,
} from '@ssg/shared/enums';

const { Schema, model } = mongoose;

const AddressSchema = new Schema(
  {
    label: String,
    fullName: { type: String, required: true },
    phone: String,
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'Nigeria' },
    postalCode: String,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false },
);

const MembershipSchema = new Schema(
  {
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.NONE,
    },
    plan: { type: String, enum: Object.values(MEMBERSHIP_PLAN), default: null },
    addOns: [{ type: String, enum: Object.values(ADDON) }],
    startDate: Date,
    endDate: Date,
    autoRenew: { type: Boolean, default: true },
    paystackCustomerCode: String,
    paystackSubscriptionCode: String,
    paystackAuthorizationCode: String, // reusable auth for cron-driven renewals
    lastRenewalAttemptAt: Date,
    renewalReminderSentFor: Date,
  },
  { _id: false },
);

const EmailListSchema = new Schema(
  {
    subscribed: { type: Boolean, default: false },
    subscribedAt: Date,
    confirmToken: String,
    confirmedAt: Date,
    unsubscribeToken: String,
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },

    membership: { type: MembershipSchema, default: () => ({}) },
    emailList: { type: EmailListSchema, default: () => ({}) },

    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: String,
    emailVerifyExpires: Date,

    passwordResetTokenHash: String,
    passwordResetExpires: Date,

    addresses: [AddressSchema],
    wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    savedSearches: [String],

    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    suspendedAt: Date,
    suspendReason: String,
  },
  { timestamps: true },
);

UserSchema.index({ 'membership.endDate': 1, 'membership.status': 1 });
UserSchema.index({ emailVerifyTokenHash: 1 }, { sparse: true });
UserSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.hasActiveMembership = function () {
  return (
    this.membership?.status === MEMBERSHIP_STATUS.ACTIVE &&
    this.membership.endDate &&
    this.membership.endDate > new Date()
  );
};

UserSchema.methods.hasAddon = function (addon) {
  return this.hasActiveMembership() && this.membership.addOns?.includes(addon);
};

UserSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.password;
    delete ret.emailVerifyTokenHash;
    delete ret.emailVerifyExpires;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.__v;
    return ret;
  },
});

export const User = model('User', UserSchema);
