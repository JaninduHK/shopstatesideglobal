import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'test') return fallback ?? 'test-placeholder';
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  port: Number(optional('PORT', '4000')),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:4000'),

  mongoUri: required('MONGODB_URI', 'mongodb://localhost:27017/state_side_global'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-do-not-use-in-prod'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-do-not-use-in-prod'),
    accessExpires: optional('JWT_ACCESS_EXPIRES', '15m'),
    refreshExpires: optional('JWT_REFRESH_EXPIRES', '7d'),
  },

  cookie: {
    domain: optional('COOKIE_DOMAIN', '') || undefined,
    secure: optional('COOKIE_SECURE', 'false') === 'true',
  },

  paystack: {
    secretKey: optional('PAYSTACK_SECRET_KEY'),
    publicKey: optional('PAYSTACK_PUBLIC_KEY'),
    webhookSecret: optional('PAYSTACK_WEBHOOK_SECRET'),
    plans: {
      basic: optional('PAYSTACK_BASIC_PLAN_CODE'),
      addon1: optional('PAYSTACK_ADDON1_PLAN_CODE'),
      addon2: optional('PAYSTACK_ADDON2_PLAN_CODE'),
    },
  },

  cloudinary: {
    cloudName: optional('CLOUDINARY_CLOUD_NAME'),
    apiKey: optional('CLOUDINARY_API_KEY'),
    apiSecret: optional('CLOUDINARY_API_SECRET'),
    uploadPreset: optional('CLOUDINARY_UPLOAD_PRESET'),
  },

  email: {
    brevoApiKey: optional('BREVO_API_KEY'),
    sendgridKey: optional('SENDGRID_API_KEY'),
    from: optional('EMAIL_FROM', 'noreply@statesideglobal.com'),
    fromName: optional('EMAIL_FROM_NAME', 'State Side Global'),
  },

  admin: {
    email: optional('ADMIN_EMAIL'),
    setupSecret: optional('ADMIN_SETUP_SECRET'),
  },
};
