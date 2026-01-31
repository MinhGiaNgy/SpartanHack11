# SpartanHack11
SpartaSafe – campus safety map and AI assistant.

## Quick start (new machine)

1) Install dependencies
```
npm.cmd install
```

2) Create `.env` with your Supabase connection string
```
DATABASE_URL=postgresql://...
```

3) Set up Prisma + DB
```
npx prisma migrate deploy
npx prisma generate
```

4) Run the app
```
npm.cmd run dev
```

## Ingest data (optional)

CrimeMapping (East Lansing area):
```
curl.exe -X POST "http://localhost:3000/api/cron/crime?days=7"
```

MSU Clery (campus incidents):
```
curl.exe -X POST "http://localhost:3000/api/cron/clery?start=0&length=250"
```

## Notes
- Prisma config lives in `prisma.config.ts` and reads `DATABASE_URL` from `.env`.
- If you rotate DBs, restart the dev server so env vars reload.