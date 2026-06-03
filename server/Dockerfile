# --- State Side Global API (Express) ---
# Build context MUST be the repo root (workspaces live there):
#   docker build -f server/Dockerfile .
FROM node:20-alpine

WORKDIR /app

# Install only what the workspaces need to resolve, then prod deps.
# All three workspace package.json files are required so npm's workspace
# resolution matches package-lock.json (an npm ci invariant).
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm ci --omit=dev

# Application source (client source is intentionally not copied into the API image).
COPY shared/ shared/
COPY server/ server/

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Basic container healthcheck against the app's /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/server.js"]
