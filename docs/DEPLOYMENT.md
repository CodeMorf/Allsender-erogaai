# Production Deployment Guide — ErogaAI SaaS

## Environment Requirements
- Node.js v18+
- PostgreSQL or SQLite
- Environment Variables configured via `.env`

## Build & Run Steps

```bash
# 1. Install dependencies
npm install

# 2. Run Database Migrations
npx prisma migrate deploy

# 3. Compile Production Bundle
npm run build

# 4. Start Production Server
npm start
```

Server listens on `http://0.0.0.0:3000` (or `PORT` env var).
