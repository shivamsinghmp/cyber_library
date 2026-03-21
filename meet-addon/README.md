# Google Meet Add-on – Virtual Library

This folder contains the **deployment manifest** for the Virtual Library Google Meet add-on. The add-on code lives in the main app at `src/app/meet-addon/`.

**Full step-by-step setup:** see **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** for the complete process (Google Cloud project, enabling APIs, creating deployment, installing and testing).

## What the add-on does

- **Today's task**: Students set a task for the day in the Meet side panel and mark it complete. Status syncs to their dashboard.
- **Polls / quiz**: Admins create polls under Admin → Meet Polls. Students see and answer them in the Meet add-on; answers appear on their dashboard.

## Deploying the add-on to Google Meet

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select your project (or create one).
2. Enable the **Google Meet Add-on API** (or follow [Meet add-on quickstart](https://developers.google.com/workspace/meet/add-ons/guides/quickstart)).
3. Go to **APIs & Services → Meet Add-on** (or the deployment section for Meet add-ons).
4. Create a new deployment and paste the contents of `deployment.json`.
5. Replace `https://cyberlib.in` and logo URLs with your production domain if different.
6. The **sidePanelUrl** must be your live site, e.g. `https://yourdomain.com/meet-addon/panel`.

## Using the add-on in a meeting

1. In a Google Meet call, open the **Activities** (or **Apps**) panel.
2. Find **Virtual Library** and open it.
3. Students log in with their Virtual Library email/password.
4. They can set today's task, mark it complete, and answer any active polls. Data appears on their dashboard at your site.

## CORS and iframe

The app allows the add-on page to be embedded in Meet by:

- Sending `Content-Security-Policy: frame-ancestors https://*.meet.google.com` for `/meet-addon/*`.
- Allowing requests from `meet.google.com` in the add-on API routes (`/api/meet-addon/*`).

No extra config is needed if your production domain is already set in `NEXT_PUBLIC_SITE_URL`.
