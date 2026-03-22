FROM node:20-alpine AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json package-lock.json tsconfig.base.json turbo.json ./

# Copy all packages and the backend app
COPY packages/ packages/
COPY apps/demo-backend/ apps/demo-backend/

# Install dependencies
RUN npm ci

# Build all packages
RUN npx turbo run build --filter=@securepool/*

# Build the backend app
RUN cd apps/demo-backend && npx tsc

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/apps/demo-backend/ apps/demo-backend/
COPY --from=builder /app/node_modules/ node_modules/

EXPOSE 5001

CMD ["node", "apps/demo-backend/dist/index.js"]
