# --- State Side Global web (Vite build, served by Caddy with auto-HTTPS) ---
# Build context MUST be the repo root (workspaces live there):
#   docker build -f client/Dockerfile .

# 1) Build the static SPA bundle.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY shared/ shared/
COPY client/ client/

# Vite inlines these at build time, so they must be passed as build args.
ARG VITE_API_URL
ARG VITE_PAYSTACK_PUBLIC_KEY
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PAYSTACK_PUBLIC_KEY=$VITE_PAYSTACK_PUBLIC_KEY \
    VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME \
    VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

RUN npm run build:client

# 2) Serve the bundle + reverse-proxy the API. Caddy obtains/renews TLS automatically.
FROM caddy:2-alpine
COPY --from=build /app/client/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
