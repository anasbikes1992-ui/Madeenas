This is the Madeena Textile stock platform:

- Web/API: Next.js + Prisma (`textilestock`)
- Mobile: Flutter (`textilestock_mobile`)

## Getting Started (Web)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mobile App (Flutter)

Build using your Flutter SDK path:

```bash
cd ../textilestock_mobile
d:/Flutter/bin/flutter.bat pub get
d:/Flutter/bin/flutter.bat analyze
d:/Flutter/bin/flutter.bat test
d:/Flutter/bin/flutter.bat build apk --release --dart-define=ENV=production --dart-define=API_URL=https://madeenas.vercel.app/api
```

APK output:

```text
textilestock_mobile/build/app/outputs/flutter-apk/app-release.apk
```

## Hourly Database Backup Email (Vercel Cron)

The app includes an internal cron endpoint at `/api/internal/backup/hourly`.

It is scheduled hourly via `vercel.json` and is protected by `BACKUP_CRON_SECRET`.

Required environment variables:

- `BACKUP_ENABLED=true`
- `BACKUP_CRON_SECRET=<long-random-secret>`
- `BACKUP_ADMIN_EMAILS=admin1@domain.com,admin2@domain.com`
- `BACKUP_FROM_EMAIL=noreply@domain.com`
- `RESEND_API_KEY=re_xxx`
- `BACKUP_MAX_ROWS_PER_TABLE=5000`

Manual smoke test:

```bash
curl -X POST http://localhost:3000/api/internal/backup/hourly \
	-H "Authorization: Bearer YOUR_BACKUP_CRON_SECRET"
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
