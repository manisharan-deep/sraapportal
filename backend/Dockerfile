# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Production stage ----
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Security: use dumb-init for proper signal handling (PID 1)
RUN apk --no-cache add dumb-init

WORKDIR /app

# Copy only production dependencies and runtime files
COPY --from=build /app/node_modules ./node_modules
COPY src/ ./src/
COPY public/ ./public/

RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

ENV NODE_ENV=production
USER appuser

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
