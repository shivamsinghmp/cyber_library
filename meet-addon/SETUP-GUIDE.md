# Google Meet Add-on – Full Setup Guide (Step-by-Step)

Yeh guide Virtual Library / CyberLib ke Google Meet add-on ko **zero se deploy** karne ke liye hai.

---

## Prerequisites (Pehle yeh ready hona chahiye)

1. **Website live honi chahiye** – Add-on ka side panel aapki site par host hai (e.g. `https://cyberlib.in/meet-addon/panel`). Pehle site deploy karo aur SSL (HTTPS) enable karo.
2. **Logo URL** – Ek logo image jo publicly accessible ho (e.g. `https://cyberlib.in/logo.svg`).

---

## Step 1: Google Cloud Project banana

1. Browser mein jao: [Google Cloud Console](https://console.cloud.google.com/)
2. Top bar mein **project dropdown** (project name) pe click karo.
3. **"New Project"** pe click karo.
4. **Project name** daalo (e.g. `Virtual Library` ya `CyberLib Meet Addon`).
5. **Create** dabao. Jab project ban jaye, us project ko **select** kar lo.

---

## Step 2: APIs enable karna

1. Left sidebar se **"APIs & Services"** → **"Library"** pe jao  
   (ya search bar mein "API Library" likho).
2. Search box mein type karo: **`Google Workspace add-ons API`**
   - Result mein **"Google Workspace add-ons API"** dikhega → pe us pe click karo.
   - **Enable** button dabao.
3. Wapas **API Library** pe jao.
4. Ab search karo: **`Google Workspace Marketplace SDK`**
   - **Important:** "Google Workspace **Marketplace SDK**" choose karo ( **API** wala nahi).
   - **Enable** dabao.

---

## Step 3: Google Workspace Marketplace SDK – Deployment banana

1. Left sidebar: **APIs & Services** → **"Enabled APIs & services"**.
2. List mein **"Google Workspace Marketplace SDK"** dhoondo aur click karo  
   (agar dikhe nahi to API Library se "Google Workspace Marketplace SDK" search karke enable karo).
3. **"Google Workspace Marketplace SDK"** ke andar ab **configuration** karni hai.

   **Option A – Agar pehle se koi add-on config nahi hai:**

   - **"Configure"** ya **"Publish your app"** / **"Configure your app"** jaisa button dikhe to us pe click karo.
   - Agla step **App configuration** hai (Step 4).

   **Option B – Agar "App configuration" tab dikhe:**

   - **"App configuration"** tab pe jao (Step 4).

---

## Step 4: App configuration (App integration)

1. **"App configuration"** tab open karo.
2. **"App integration"** section mein:
   - **"Google Workspace add-on"** select karo (checkbox/radio).
   - **"Deploy using cloud deployment resource"** choose karo.
   - **"HTTP deployment"** select karo (agar option ho).
3. **"Submit"** / **"Next"** dabao.

---

## Step 5: HTTP deployment create karna (Manifest paste karna)

1. **"HTTP deployments"** tab pe jao.
2. **"Create new deployment"** pe click karo.
3. **Deployment ID** daalo (e.g. `virtual-library-meet-addon` ya `cyberlib-meet`).  
   - Max 100 characters, spaces allowed.
4. **Next** dabao. Ek side panel ya form khulega jahan **add-on manifest (JSON)** paste karna hai.

5. Apni project ki file `meet-addon/deployment.json` kholo. Uska content copy karo.  
   Agar domain alag hai (e.g. `yourdomain.com`) to pehle values change karo:

   - `name` → Apne add-on ka naam (e.g. "Virtual Library" ya "CyberLib").
   - `logoUrl` → Logo ka full URL (e.g. `https://cyberlib.in/logo.svg`).
   - `sidePanelUrl` → **Zaroor** aapki live site ka panel URL, e.g.  
     `https://cyberlib.in/meet-addon/panel`
   - `addOnOrigins` → Sirf woh origin jahan add-on host hai, e.g.  
     `["https://cyberlib.in"]`
   - `logoUrl` / `darkModeLogoUrl` (meet.web) → Same logo URL agar alag dark logo nahi hai.

   **Example (cyberlib.in ke liye):**

   ```json
   {
     "addOns": {
       "common": {
         "name": "Virtual Library",
         "logoUrl": "https://cyberlib.in/logo.svg"
       },
       "meet": {
         "web": {
           "sidePanelUrl": "https://cyberlib.in/meet-addon/panel",
           "supportsScreenSharing": false,
           "addOnOrigins": ["https://cyberlib.in"],
           "logoUrl": "https://cyberlib.in/logo.svg",
           "darkModeLogoUrl": "https://cyberlib.in/logo.svg"
         }
       }
     }
   }
   ```

6. Yeh JSON **manifest** wale box mein **paste** karo.
7. **Create** / **Save** dabao. Deployment create ho jayega.

---

## Step 6: Add-on install karke test karna

1. **HTTP deployments** list mein apna deployment dikhega.
2. Us deployment ke saamne **"Install"** (Actions column) pe click karo.
3. **Install** confirm karo. Yeh add-on ab **sirf aapke signed-in Google account** ke liye install ho jata hai (unpublished).
4. Naya tab khol ke [meet.google.com/new](https://meet.google.com/new) pe jao aur **meeting start** karo.
5. Meeting window mein:
   - **Activities** (ya **Apps** / meeting tools) icon pe click karo (bottom bar).
   - List mein **"Virtual Library"** (ya jo name aapne diya) dikhna chahiye.
   - Us pe click karo → side panel khulega aur aapki site ka **sidePanelUrl** (e.g. `/meet-addon/panel`) iframe mein load hoga.

6. Panel mein:
   - **Option 1:** Dashboard se **6-digit code** lao, add-on mein "Enter code from dashboard" mein daalo, **Link with code** dabao.
   - **Option 2:** Email + password se **Log in** karo.
7. Login/code ke baad Today's task aur Polls use karke check karo ki sab theek kaam kar raha hai.

---

## Step 7 (Optional): Logo / domain change

- **Logo:** `deployment.json` mein `logoUrl`, `meet.web.logoUrl`, `meet.web.darkModeLogoUrl` sab same ya alag URLs daal sakte ho. Logo publicly accessible (HTTPS) hona chahiye.
- **Domain:** Agar site kisi aur domain pe move karo (e.g. `app.example.com`):
  1. `sidePanelUrl` ko naya URL do: `https://app.example.com/meet-addon/panel`
  2. `addOnOrigins` mein naya origin do: `["https://app.example.com"]`
  3. Cloud Console → same deployment → **Edit** se manifest update karke save karo.
  4. Site par `next.config.ts` / CORS already `meet.google.com` allow karta hai; naya origin agar app use karta hai to app-side CORS bhi update karo.

---

## Step 8 (Optional): Publish karna (sabke liye available)

Jab add-on test mein theek kaam kare:

1. Google Cloud Console → **Google Workspace Marketplace SDK** → **Publish** / **Publishing status** section.
2. **Publish app** / **Request publishing** jaisa option follow karo.
3. Google review ke baad add-on **public** ho sakta hai; phir koi bhi user Meet ke andar "Activities" se install kar sakta hai.

Detail ke liye: [Publish your Meet add-on](https://developers.google.com/workspace/meet/add-ons/guides/publish).

---

## Troubleshooting

| Problem | Solution |
|--------|----------|
| Side panel blank / load nahi ho raha | Check `sidePanelUrl` browser mein direct open ho raha hai (HTTPS). Check site par `/meet-addon/*` ke liye `frame-ancestors` header allow karta hai (e.g. `meet.google.com`). |
| "Add-on not found" / list mein nahi dikhta | Same Google account se Install kiya hai na? HTTP deployments tab se "Install" dubara try karo. |
| Login/code error in add-on | Backend (e.g. `/api/meet-addon/*`) CORS mein `meet.google.com` allow hai. Production env vars (e.g. `AUTH_SECRET`, `DATABASE_URL`) sahi hon. |
| Logo nahi dikh raha | `logoUrl` / `darkModeLogoUrl` direct browser mein open karke check karo; HTTPS hona chahiye. |

---

## Short checklist

- [ ] Google Cloud project bana liya
- [ ] Google Workspace add-ons API enable ki
- [ ] Google Workspace **Marketplace SDK** enable kiya (API nahi)
- [ ] App configuration → Google Workspace add-on → HTTP deployment select kiya
- [ ] HTTP deployment create kiya, `deployment.json` ka JSON paste kiya
- [ ] `sidePanelUrl` aur `addOnOrigins` apni domain se match kar rahe hain
- [ ] Site live hai, `/meet-addon/panel` open ho raha hai
- [ ] "Install" karke Meet meeting mein add-on dikh raha hai aur panel load ho raha hai
- [ ] Code ya email/password se login ho raha hai aur task/poll kaam kar rahe hain

Iske baad add-on use karne ke liye students ko sirf meeting ke andar **Activities** → **Virtual Library** open karke code ya login karna hai; today's task aur poll answers dashboard pe dikhenge.
