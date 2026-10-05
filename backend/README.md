# Nala Watch — Backend

Express 4 application backend for the Nala Watch flood-reporting system.
Sits between the React frontend and Kamal's Cloud API (API Gateway → Lambda).

## Stack

- **Node.js 20 LTS** + ES modules
- **Express 4** — routing, middleware
- **zod** — env var and request body validation
- **pino** — structured JSON logging
- **aws-jwt-verify** — Cognito JWT verification (skipped in mock mode)
- **helmet / cors / express-rate-limit** — security baseline

---

## Quick start (local, mock mode)

```bash
cd backend
cp .env.example .env          # defaults are fine for mock mode
npm install
npm run dev                   # starts on http://localhost:8080
```

Verify it is running:

```bash
curl http://localhost:8080/health
# → {"status":"ok","timestamp":"..."}
```

`USE_MOCK=true` (the default) means all API calls return seed data from
`src/mocks/`. No AWS credentials are needed.

---

## Running with the real Cloud API (after Handoff 4)

Edit `.env`:

```
USE_MOCK=false
CLOUD_API_BASE_URL=https://<api-gateway-id>.execute-api.ap-south-1.amazonaws.com/prod
CLOUD_API_KEY=<key-from-secrets-manager>
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

Then restart the server. No code changes required — the switch is purely
the `USE_MOCK` env var.

---

## API reference

All endpoints are under `/api/v1` except the health check.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness check |
| POST | `/api/v1/uploads/presign` | none (rate-limited) | Get presigned S3 PUT URL |
| POST | `/api/v1/reports` | none (rate-limited) | Submit a flood report |
| GET | `/api/v1/reports` | none | Map pins (`?bbox=&since=&limit=`) |
| GET | `/api/v1/reports/:id` | none | Poll status / assessment |
| PATCH | `/api/v1/reports/:id/confirm` | none | Citizen confirms/corrects depth |
| GET | `/api/v1/risk` | none | Risk segments (`?bbox=`) |
| POST | `/api/v1/alerts/subscriptions` | none (rate-limited) | Subscribe to alerts |
| DELETE | `/api/v1/alerts/subscriptions/:id` | none | Unsubscribe |
| GET | `/api/v1/auth/me` | JWT | Current user + role |
| GET | `/api/v1/wards` | none | List wards |
| GET | `/api/v1/ward/hotspots` | JWT `ward_officer` | Ranked pump-priority list |
| GET | `/api/v1/ward/reports` | JWT `ward_officer` | Report feed (`?wardId=&status=`) |
| PATCH | `/api/v1/ward/reports/:id/status` | JWT `ward_officer` | Update ops status |

### Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "lat must be between -90 and 90",
    "details": [{ "field": "lat", "message": "..." }]
  }
}
```

Error codes: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 ·
`NOT_FOUND` 404 · `RATE_LIMITED` 429 · `UPSTREAM_ERROR` 502 · `UPSTREAM_TIMEOUT` 504

### Mock mode — analyzing → assessed transition

`POST /api/v1/reports` returns `{ status: "analyzing" }` immediately.
After **~3 seconds** the report transitions to `"assessed"` in memory.
Poll `GET /api/v1/reports/:id` every 2 s until `status !== "analyzing"`.

---

## Docker

Build and run locally:

```bash
# From the backend/ directory
docker build -t nala-watch-backend .

docker run --rm \
  -p 8080:8080 \
  -e USE_MOCK=true \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  nala-watch-backend
```

The container runs as a non-root user (`nala`), exposes port 8080, and
has a `HEALTHCHECK` on `GET /health`.

### Deploy to ECR + EC2/ECS (Kamal)

```bash
# Authenticate
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

# Build and push
docker build -t nala-watch-backend .
docker tag nala-watch-backend:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/nala-watch-backend:latest
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/nala-watch-backend:latest
```

Inject secrets via the EC2/ECS task role and SSM Parameter Store — never
pass `CLOUD_API_KEY` or `COGNITO_*` values as plain environment variables
in CI pipelines.

---

## Project structure

```
backend/
  src/
    app.js              Express app (middleware + route mounting)
    server.js           HTTP server entry point
    logger.js           Pino logger singleton
    config/
      env.js            Zod env validation — fails fast on bad config
    routes/
      health.js         GET /health
      uploads.js        POST /api/v1/uploads/presign
      reports.js        Reports CRUD + poll
      risk.js           GET /api/v1/risk
      alerts.js         Alert subscriptions
      auth.js           GET /api/v1/auth/me
      wards.js          GET /api/v1/wards
      ward.js           Ward officer dashboard routes
    services/
      index.js          Selects mock or real impl via USE_MOCK
      mockApi.js        Seed-data implementation with ~3 s analysis delay
      cloudApi.js       Real Cloud API implementation (undici fetch)
    middleware/
      auth.js           Cognito JWT verify + role check
      errorHandler.js   AppError class + central error formatter
      rateLimit.js      express-rate-limit configs
      validate.js       Zod request validator factory
    mocks/
      reports.json      Seed flood reports
      risk.json         Seed risk segments
      hotspots.json     Seed ward hotspots
      wards.json        Seed ward list
      subscriptions.json Seed alert subscriptions
  Dockerfile
  .env.example
  package.json
  README.md
```
