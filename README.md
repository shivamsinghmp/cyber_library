# Virtual Library – The Focus Hub

Next.js app with PostgreSQL (Prisma), NextAuth.js (Email/Password + Google), and Tailwind (Coffee/Cream theme).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` (PostgreSQL) and `AUTH_SECRET`
   - Optional: `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for Google login

3. **Database**
   ```bash
   npx prisma db push
   # or: npx prisma migrate dev --name init
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – run ESLint
