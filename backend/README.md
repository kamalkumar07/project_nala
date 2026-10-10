# PARVAT — Application Backend

> **Owner:** Hardik (Frontend + Application Backend Engineer)  
> **Purpose:** Express application layer between the React frontend and the Nala Cloud API.  
> **Stack:** Node.js 20 LTS · Express 4 · ES modules · Zod · Pino · Docker

---

## Architecture

```
React Frontend  (port 5173)
       │  HTTPS  /api/v1/*
       ▼
Express Backend  (port 8080)          ← Hardik owns everything above this line
       │  HTTPS  x-api-key
       ▼
Nala Cloud API  (Kamal)               ← Kamal owns everything below this line
       │
  API Gateway → Lambda → DynamoDB / S3 / Bedrock / Risk Engine
```

Express never touches DynamoDB directly.  
All data access goes through the Cloud API.

---

## Quick Start (local, mock mode — no AWS credentials needed)

```bash
cd backend
cp .env.example .env      # defaults work as-is
npm install
npm run dev               # → http://localhost:8080
```

Verify:
```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"..."}
```

`USE_MOCK=true` (default) — all API calls return seeded data from `src/mocks/`.  
Switch one env var to go live: `USE_MOCK=false` + Cloud API credentials.

---

## Endpoint Reference

All routes are prefixed `/api/v1` except `/health`.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness check for load balancer / CI |

**Response 200**
```json
{ "status": "ok", "timestamp": "2026-10-09T10:00:00Z" }
```

---

### Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/uploads/presign` | none (rate-limited) | Get a presigned S3 PUT URL |

**Request body**
```json
{ "contentType": "image/jpeg", "sizeBytes": 2400000 }
```

**Response 200**
```json
{
  "photoKey":  "reports/2026/10/09/abc123.jpg",
  "uploadUrl": "https://nala-bucket.s3.ap-south-1.amazonaws.com/...",
  "expiresIn": 300
}
```

> After receiving the presigned URL, the **browser PUTs directly to S3** — the photo never passes through Express.

---

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/reports` | none (rate-limited) | Submit a hazard report |
| GET | `/api/v1/reports` | none | Map pins (`?bbox=minLng,minLat,maxLng,maxLat&since=ISO&limit=200`) |
| GET | `/api/v1/reports/:id` | none | Poll status + AI assessment |
| PATCH | `/api/v1/reports/:id/confirm` | none (report token) | Citizen confirms / corrects AI result |

**POST /reports — request body**
```json
{
  "photoKey":        "reports/2026/10/09/abc123.jpg",
  "lat":             28.6448,
  "lng":             77.2167,
  "hazardType":      "flood",
  "note":            "Outside main gate",
  "clientTimestamp": "2026-10-09T10:15:00Z"
}
```

> `hazardType` enum: `flood` | `waterlogging` | `landslide` | `road_damage` | `other`  
> Default: `flood`

**POST /reports — response 201**
```json
{ "reportId": "rpt_01H...", "status": "analyzing", "reportToken": "tok_..." }
```

> Poll `GET /reports/:id` every 2 s until `status` is `assessed` or `failed`.

**GET /reports/:id — response 200 (assessed)**
```json
{
  "reportId":   "rpt_01H...",
  "status":     "assessed",
  "lat":        28.6448,
  "lng":        77.2167,
  "wardId":     "ward_07",
  "wardNo":     "80",
  "wardName":   "Chandni Chowk",
  "hazardType": "flood",
  "createdAt":  "2026-10-09T10:15:02Z",
  "assessment": {
    "depthClass":  "knee",
    "passable":    "no",
    "confidence":  0.78,
    "rationale":   "Water above car tyre line"
  },
  "userConfirmed":   false,
  "userDepthClass":  null,
  "opsStatus":       "open"
}
```

**PATCH /reports/:id/confirm — request body**
```json
{ "userConfirmed": true, "userDepthClass": "knee" }
```

> `userDepthClass` values: `ankle` | `knee` | `waist` | `unknown`

---

### Hotspots  ⭐ Primary Phase 3 endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/hotspots` | none | Ranked flood-risk hotspots |

**Query params**
| Param | Type | Description |
|-------|------|-------------|
| `district` | string | Filter by district name (e.g. `North Delhi`) |
| `bbox` | string | `minLng,minLat,maxLng,maxLat` |
| `riskBand` | `LOW`\|`MEDIUM`\|`HIGH` | Minimum risk band filter |
| `limit` | integer 1–100 | Default 20 |

**Response 200**
```json
{
  "hotspots": [
    {
      "hotspotId":     "hsp_001",
      "district":      "North Delhi",
      "wardId":        "ward_07",
      "wardNo":        "80",
      "wardName":      "Chandni Chowk",
      "latitude":      28.6448,
      "longitude":     77.2167,
      "riskScore":     91,
      "riskBand":      "HIGH",
      "reportCount":   5,
      "activeReports": 4,
      "lastUpdated":   "2026-10-09T10:05:00Z",
      "riskFactors": {
        "rainfall": 0.38,
        "reports":  0.35,
        "lowness":  0.18
      }
    }
  ],
  "total":     1,
  "updatedAt": "2026-10-09T10:10:00Z"
}
```

> **Kamal:** When `REAL_HOTSPOTS=true`, Express forwards to:  
> `GET /cloud/hotspots?district=&bbox=&riskBand=&limit=`  
> Please confirm the exact path and whether pagination uses `cursor` or `offset`.

---

### Risk

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/risk` | none | Risk segments for map overlay (`?bbox=`) |

**Response 200** — array of segments
```json
[
  {
    "segmentId": "seg_07_NORTH_001",
    "wardId":    "ward_07",
    "score":     0.82,
    "band":      "severe",
    "drivers":   { "rain": 0.35, "reports": 0.30, "lowness": 0.17 },
    "updatedAt": "2026-10-09T10:05:00Z"
  }
]
```

> `band` values: `low` | `moderate` | `high` | `severe`

---

### Alerts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/alerts/subscriptions` | none (rate-limited) | Subscribe to nearby alerts |
| DELETE | `/api/v1/alerts/subscriptions/:id` | none | Unsubscribe |

**POST request body**
```json
{
  "channel":  "email",
  "contact":  "user@example.com",
  "lat":      28.6448,
  "lng":      77.2167,
  "radiusM":  1000
}
```
> `channel`: `email` | `push`

**POST response 201**
```json
{ "subscriptionId": "sub_...", "channel": "email", "contact": "...", "lat": 28.6448, "lng": 77.2167, "radiusM": 1000 }
```

---

### Ward Officer (protected — `ward_officer` Cognito group required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/auth/me` | JWT | Current user + role |
| GET | `/api/v1/wards` | none | List wards (pilot seed) |
| GET | `/api/v1/ward/hotspots` | JWT `ward_officer` | Ranked pump-priority list (`?wardId=`) |
| GET | `/api/v1/ward/reports` | JWT `ward_officer` | Report feed (`?wardId=&status=`) |
| PATCH | `/api/v1/ward/reports/:id/status` | JWT `ward_officer` | `open → dispatched → resolved` |

> In `USE_MOCK=true` mode, any Bearer token is accepted and a synthetic  
> `demo_officer` identity with `ward_officer` group is injected.

---

## Error Format

All error responses follow this envelope:

```json
{
  "error": {
    "code":    "VALIDATION_ERROR",
    "message": "lat must be between -90 and 90",
    "details": [{ "field": "lat", "message": "Number must be ≤ 90" }]
  }
}
```

| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Zod schema rejection |
| 401 | `UNAUTHORIZED` | Missing / invalid JWT |
| 403 | `FORBIDDEN` | Wrong Cognito group, or invalid `reportToken` |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Per-IP rate limit exceeded |
| 502 | `UPSTREAM_ERROR` | Cloud API returned an error |
| 504 | `UPSTREAM_TIMEOUT` | Cloud API did not respond within 8 s |

---

## Environment Variables

Copy `.env.example` → `.env`. **Never commit `.env`.**

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `8080` | Express listen port |
| `NODE_ENV` | `development` | |
| `USE_MOCK` | `true` | `false` requires Cloud API credentials |
| `CLOUD_API_BASE_URL` | — | Required when `USE_MOCK=false` |
| `CLOUD_API_KEY` | — | API Gateway usage-plan key. **Never commit.** |
| `CLOUD_API_TIMEOUT_MS` | `8000` | Upstream timeout |
| `REAL_PRESIGN` | `false` | Route `presignUpload` to Cloud API while keeping rest on mock |
| `REAL_REPORTS` | `false` | Route `createReport / getReport / listReports` to Cloud API |
| `REAL_CONFIRM` | `false` | Route `confirmReport` to Cloud API |
| `REAL_HOTSPOTS` | `false` | Route `getHotspots` to Cloud API |
| `AWS_REGION` | `ap-south-1` | |
| `COGNITO_USER_POOL_ID` | — | JWT verification |
| `COGNITO_CLIENT_ID` | — | JWT verification |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS allow-list |
| `MAX_UPLOAD_BYTES` | `5242880` | 5 MB |
| `RATE_LIMIT_WINDOW_MS` | `60000` | 1 minute |
| `RATE_LIMIT_MAX` | `20` | Requests per IP per window |
| `LOG_LEVEL` | `info` | `trace` · `debug` · `info` · `warn` · `error` |

### Per-feature flip strategy (rolling Cloud API integration)

Start with `USE_MOCK=true`. Flip each flag to `true` as Kamal delivers each endpoint:

```
Step 1 → REAL_HOTSPOTS=true     (once GET /cloud/hotspots is live)
Step 2 → REAL_PRESIGN=true      (once POST /cloud/uploads/presign is live)
Step 3 → REAL_REPORTS=true      (once POST+GET /cloud/reports is live)
Step 4 → REAL_CONFIRM=true      (once PATCH /cloud/reports/{id} is live)
Step 5 → USE_MOCK=false         (full production mode)
```

---

## Docker

```bash
# Build
docker build -t nala-watch-backend .

# Run (mock mode)
docker run --rm -p 8080:8080 \
  -e USE_MOCK=true \
  -e NODE_ENV=production \
  nala-watch-backend
```

- Multi-stage build (`node:20-alpine`)
- Non-root user (`nala`)
- `EXPOSE 8080`
- `HEALTHCHECK` on `GET /health`

### Deploy to ECR + EC2/ECS

```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t nala-watch-backend .
docker tag nala-watch-backend:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/nala-watch-backend:latest
docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/nala-watch-backend:latest
```

Inject `CLOUD_API_KEY` and `COGNITO_*` at runtime from SSM Parameter Store — never as plain CI env vars.

---

## Project Structure

```
backend/
  src/
    app.js                Express app (middleware + route mounting)
    server.js             Entry point — binds PORT
    logger.js             Pino JSON logger
    config/
      env.js              Zod env validation — process.exit(1) on bad config
    routes/
      health.js           GET /health
      uploads.js          POST /api/v1/uploads/presign
      reports.js          Reports CRUD
      hotspots.js         GET /api/v1/hotspots  ← Phase 3 primary endpoint
      risk.js             GET /api/v1/risk
      alerts.js           Alert subscriptions
      auth.js             GET /api/v1/auth/me
      wards.js            GET /api/v1/wards
      ward.js             Ward officer dashboard routes
    services/
      index.js            Per-function router (USE_MOCK + REAL_* flags)
      mockApi.js          Seeded JSON, 3 s analyzing→assessed simulation
      cloudApi.js         Real Cloud API calls (undici, 8 s timeout)
    middleware/
      auth.js             Cognito JWT verify + role check
      errorHandler.js     Standard error envelope
      rateLimit.js        Per-IP rate limits
      validate.js         Zod request validator factory
    mocks/
      reports.json        5 seeded flood reports (with hazardType)
      hotspots.json       5 seeded hotspots (Phase 3 shape)
      risk.json           5 seeded risk segments
      wards.json          4 pilot wards
      subscriptions.json  1 seeded subscription
  Dockerfile
  .env.example
  package.json
  README.md  ← this file
```

---

## Handoff: What Hardik needs from Kamal

| # | Endpoint | Status | Notes |
|---|----------|--------|-------|
| 1 | `GET /cloud/hotspots` | **NEEDED** | Path, query params, pagination scheme |
| 2 | `POST /cloud/uploads/presign` | Agreed | See §Uploads |
| 3 | `POST /cloud/reports` | Agreed | Returns `reportId`, `status: "analyzing"`, `reportToken` |
| 4 | `GET /cloud/reports/{id}` | Agreed | Nested `assessment` object |
| 5 | `GET /cloud/reports?geohash=` | Agreed | Prefix-based, paginated with `cursor` |
| 6 | `PATCH /cloud/reports/{id}` | Agreed | 403 on invalid `reportToken` |
| 7 | `GET /cloud/risk` | Needed | Shape TBD — currently on mock |
| 8 | AWS region + Bedrock model availability | Open | |
| 9 | Cognito User Pool ID + Client ID | Open | For JWT verification |
| 10 | EC2 vs ECS hosting preference | Open | Affects Dockerfile config |

## Handoff: What Kamal needs from Hardik

All backend API contracts above (this README) plus:
- Frontend data requirements (done — see table above)
- Integration test results once REAL_* flags are flipped on
