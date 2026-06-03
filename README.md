# State Side Global

Luxury MERN e-commerce platform. Membership-gated, admin-only seller, Nigerian Naira via Paystack.

## Stack

- **Frontend:** React + Vite + Redux Toolkit + RTK Query + Tailwind CSS + React Router v6
- **Backend:** Node.js + Express + MongoDB (Mongoose) + JWT
- **Payments:** Paystack (NGN, in kobo internally)
- **Email:** SendGrid (Nodemailer in dev)
- **Images:** Cloudinary (signed uploads)

## Monorepo layout

```
/client     React frontend (Vite)
/server     Express API
/shared     Constants, enums, currency helpers shared by both
/docs       Architecture, ERD, API contract, component tree, roadmap
```

## Prerequisites

- Node.js v20+
- MongoDB Atlas connection string (or local Mongo)
- Optional for full functionality: Paystack, Cloudinary, SendGrid API keys

## Setup

```bash
# Install dependencies for all workspaces
npm install

# Copy env templates
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your values

# Run both servers in parallel
npm run dev
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:5173`.

## Phase 1 scope (current)

- Monorepo scaffold (npm workspaces)
- Auth: register, verify email, login, refresh, logout, forgot/reset password
- JWT access (15m) + httpOnly refresh cookie (7d) with rotation
- Email service skeleton (logs to console if no SendGrid key)
- Public Landing page placeholder

See `/docs/05-ROADMAP.md` for full phase plan.

## Scripts

```bash
npm run dev            # Run server + client in parallel
npm run dev:server     # Run server only
npm run dev:client     # Run client only
npm run test           # Run all tests
npm run lint           # Lint both workspaces
npm run seed           # Seed database (Phase 3+)
```

## Docs

Read these before changing architecture:

- `docs/01-ARCHITECTURE.md`
- `docs/02-ERD.md`
- `docs/03-API-CONTRACT.md`
- `docs/04-COMPONENT-TREE.md`
- `docs/05-ROADMAP.md`
