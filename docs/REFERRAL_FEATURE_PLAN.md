# Referral Feature – Full Implementation Plan

**Status: Implemented.**

## Goal
- **Student Dashboard**: Referral link/code generate karne ka option; jitne bhi students us link se aayein unka data student dashboard pe dikhe.
- **Admin Dashboard**: Saare referral data (kaun kitne refer kar raha hai) admin ko dikhe.

---

## Current State (Already in DB)
- `User.referralCode` (unique) – referral code
- `User.referredById` – jis user ne isko refer kiya
- `User.referralRewarded` – first-purchase reward diya gaya ya nahi
- `referredBy` / `referrals` relations
- Signup `?ref=CODE` se `referredById` set hota hai, **but abhi sirf INFLUENCER** role wale referrer allow hain.

---

## Implementation Plan

### 1. Backend: Student referral code generation
- **Referral code for students**: Abhi `generateReferralCodeForUser` "INF-" use karta hai. Students ke liye alag prefix (e.g. **REF-** ya **VLREF-**) use karein taaki clash na ho.
- **New/updated**: `src/lib/referral.ts` – add `generateStudentReferralCode(userId)` → prefix `REF-` + unique code, same logic.

### 2. API: Student referral (generate + stats)
- **GET** `src/app/api/user/referral/route.ts`
  - Returns: `{ referralCode, referralLink, referredCount, referredUsers[] }`
  - `referredUsers`: list of users where `referredById = currentUser`, with `id, name, email, createdAt` (minimal).
- **POST** `src/app/api/user/referral/route.ts`
  - Agar user ke paas `referralCode` nahi hai to generate karo (student/influencer dono ke liye), return updated `referralCode` & `referralLink`.

### 3. Signup: Allow student referrers
- **File**: `src/app/api/auth/signup/route.ts`
  - Referrer lookup se `role: "INFLUENCER"` hatao – koi bhi user jiske paas `referralCode` hai (Student ya Influencer) referrer ho sakta hai.
  - Condition: `where: { referralCode: refCode, deletedAt: null }`.

### 4. Student Dashboard: Referral section
- **File**: `src/app/dashboard/DashboardContent.tsx` (ya alag section / page)
  - **"Refer & Earn"** / **"Apna referral link banao"** section:
    - Agar `referralCode` nahi: **"Generate referral link"** button → POST `/api/user/referral` → phir link + copy button dikhao.
    - Agar `referralCode` hai: **Referral link** (copy button), **Referred friends count**, aur **List** (name, joined date – optional email).
  - Data: GET `/api/user/referral` on load.

### 5. Admin: Referral analytics
- **API**: `src/app/api/admin/referrals/route.ts`
  - **GET**: List users jinke paas at least 1 referral hai:
    - `referrerId, referrerName, referrerEmail, referralCode, referredCount`
    - Optional: referred users list (referred name, email, createdAt).
  - Admin-only (role check).

- **Admin UI**: 
  - **Option A**: `src/app/admin/page.tsx` mein ek card "Top referrers" (count + link to full list).
  - **Option B**: New page `src/app/admin/referrals/page.tsx` – table: Referrer name, Email, Code, Referred count, (optional) Referred users list.
  - Sidebar mein "Referrals" link add karo (`RoleBasedSidebar.tsx`).

---

## Execution Order
1. **Referral lib**: Student code generation (REF- prefix).
2. **Signup**: Allow any user with referralCode as referrer.
3. **API** `/api/user/referral`: GET (stats + list) + POST (generate).
4. **Student Dashboard**: Referral section (generate button, link, copy, referred count + list).
5. **Admin API** `/api/admin/referrals`: GET.
6. **Admin page**: Referrals table + sidebar link.

---

## Data Flow Summary
- **Generate**: Student "Generate referral link" click → POST → code create → link = `{site}/signup?ref=REF-XXXXXX`.
- **Track**: Naya user signup `?ref=REF-XXXXXX` se → `referredById` = referrer userId.
- **Student view**: GET /api/user/referral → referral link + referredUsers (jo is link se aaye).
- **Admin view**: GET /api/admin/referrals → saare referrers + unke referred count/list.
