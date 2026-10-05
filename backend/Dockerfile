# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps
# Install only production dependencies in a clean layer.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# Copy the application source and the installed modules from the deps stage.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Create a non-root user so the process does not run as root inside the container
RUN addgroup -S nala && adduser -S nala -G nala

WORKDIR /app

# Copy production node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Own everything as the non-root user
RUN chown -R nala:nala /app

USER nala

EXPOSE 8080

# Liveness probe — Docker / ECS will restart the container if /health fails
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "src/server.js"]
