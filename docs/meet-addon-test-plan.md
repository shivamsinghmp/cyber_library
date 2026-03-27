# Meet Add-on Integration Test Plan

## Auth and role access

1. `POST /api/meet-addon/login` with valid student credentials returns `200` and token.
2. `POST /api/meet-addon/login` with invalid password returns `401`.
3. `POST /api/meet-addon/link-code` as authenticated student/admin returns `200`.
4. `POST /api/meet-addon/link-code` as non-student role returns `403`.

## Poll flow

1. Admin creates poll using `POST /api/admin/meet-polls`.
2. Panel loads poll via `GET /api/meet-addon/polls`.
3. Student submits one of the listed options using `POST /api/meet-addon/poll-response` and receives `200`.
4. Submitting a non-listed option returns `400`.

## Focus and gamification

1. `POST /api/meet-addon/focus/heartbeat` with `completeCycle=true` creates a `StudyCoinLog` row.
2. Marking today task complete creates `TODO_COMPLETED` coin log and updates streak.
3. `GET /api/meet-addon/leaderboard` returns ranked items with coins/streak.

## Production sanity

1. `npm run build` passes.
2. PM2 app starts without runtime errors.
3. Meet panel and main stage both render.
