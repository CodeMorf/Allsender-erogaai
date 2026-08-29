# Production Deployment Guide — ErogaAI SaaS

## Environment Requirements
- Node.js v18+
- PostgreSQL 16 in production
- Redis 7 when `REDIS_REQUIRED=true`
- Environment Variables configured via `.env`
- HTTPS for browser and PWA camera access

## Build & Run Steps

```bash
# 1. Install exact dependencies
npm ci

# 2. Generate the production Prisma client
npx prisma generate --schema=prisma/schema.postgresql.prisma

# 3. Apply versioned PostgreSQL migrations
npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma

# 4. Compile Production Bundle
npm run build

# 5. Start Production Server
npm start
```

Server listens on `http://0.0.0.0:3000` (or `PORT` env var).

## Local receipt OCR fallback

`tesseract.js` is installed by `npm ci`. On first use it loads and caches the Spanish and English trained data. The cache directory defaults to `data/tesseract` and can be changed without storing credentials:

```env
TESSERACT_CACHE_PATH="/absolute/writable/path/data/tesseract"
```

The application process must have write access to that directory. Do not commit the generated trained-data cache; `data/tesseract/` is ignored by Git.

Camera capture requires a valid HTTPS origin, browser permission and a real camera device. See [RECEIPT_SCANNER.md](RECEIPT_SCANNER.md) for the production verification checklist.
