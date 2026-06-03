// Runs BEFORE any test modules are loaded.
// ESM hoists imports above top-level statements, so setting env vars in this
// setup file is the only reliable way to have them visible to env.js.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy';
process.env.MONGODB_URI = 'mongodb://placeholder';
