# ScanMe — Frontend

Next.js 14 application serving both the photographer studio dashboard and the guest event page. Photographers manage events and generate QR codes. Guests scan the QR code, view the event gallery, and upload a selfie to find their own photos instantly.

**Port:** `3000`  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · PWA

---

## What This App Contains

### Photographer side (requires login)

| Route | Description |
|---|---|
| `/` | Landing page |
| `/auth` | Login and signup for photographers |
| `/photographer-dashboard` | Create/edit/delete events, view status, generate QR codes |

### Guest side (public)

| Route | Description |
|---|---|
| `/events/guest/[token]` | Event gallery — view all photos and upload selfie to find yourself |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout, fonts, PWA meta
│   │   ├── page.tsx                      # Landing page
│   │   ├── auth/
│   │   │   └── page.tsx                  # Login / signup
│   │   ├── photographer-dashboard/
│   │   │   └── page.tsx                  # Event management dashboard
│   │   └── events/guest/[token]/
│   │       └── page.tsx                  # Guest event page
│   ├── components/
│   │   ├── event/
│   │   │   ├── EventHeader.tsx           # Event cover photo and title
│   │   │   ├── PhotoGallery.tsx          # Masonry grid — highlights matched photos
│   │   │   ├── PhotoCard.tsx             # Single photo with download overlay
│   │   │   └── MatchedResults.tsx        # Selfie match results panel
│   │   ├── selfie/
│   │   │   ├── SelfiePanel.tsx           # Container — camera or upload + results
│   │   │   ├── CameraCapture.tsx         # Live camera with face oval guide
│   │   │   └── SelfieUploader.tsx        # File input for uploading a photo
│   │   └── ui/
│   │       └── Spinner.tsx               # Loading spinner
│   ├── hooks/
│   │   ├── useEventData.ts               # Fetch event + photos by token
│   │   └── useSelfieMatch.ts             # Selfie validation, resize, upload, match
│   ├── services/
│   │   └── api.ts                        # All API calls — routes through gateway :80
│   ├── types/
│   │   └── index.ts                      # Shared TypeScript interfaces
│   └── utils/
│       └── imageUtils.ts                 # Client-side resize to 640×640 before upload
├── public/
│   ├── manifest.json                     # PWA manifest
│   └── sw.js                             # Service worker
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── package.json
└── Dockerfile
```

---

## Environment Variables

Create a `.env.local` file in the root of this service:

```bash
# All API calls go through the gateway — never call services directly
NEXT_PUBLIC_API_URL=http://localhost:80
```

For production replace with your domain:

```bash
NEXT_PUBLIC_API_URL=https://api.scanme.yourdomain.com
```

---

## Running Manually (Local Development)

### Prerequisites

- Node.js 20+
- npm or yarn
- API Gateway running on port 80 (or services running directly — see note below)

### Steps

```bash
# 1. Clone and enter the frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env.local
copy .env.local.example .env.local    # Windows
cp .env.local.example .env.local      # macOS/Linux

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Running without the gateway (development shortcut)

If you don't want to run the gateway, change `api.ts` to call services directly:

```typescript
// src/services/api.ts — temporary dev change
const photographerApi = axios.create({ baseURL: "http://localhost:8001" });
const guestApi        = axios.create({ baseURL: "http://localhost:8002" });
```

Remember to revert this before committing.

---

## Running with Docker

```bash
# Build
docker build -t scanme-frontend .

# Run
docker run -p 3000:3000 --env-file .env.local scanme-frontend
```

> The Dockerfile uses a two-stage build. Stage 1 compiles with `npm run build`. Stage 2 runs the Next.js standalone output — significantly smaller final image.

Add `output: 'standalone'` to `next.config.js` for the standalone build to work:

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone',
}
module.exports = nextConfig
```

---

## Key Behaviours

### Selfie privacy
The selfie never leaves the browser as a raw file:
1. `imageUtils.ts` resizes it to 640×640 JPEG in a canvas — in browser memory only
2. The resized blob is uploaded to `/match/selfie`
3. The blob falls out of scope after the request completes
4. The server deletes the bytes immediately after extracting the embedding

### Dashboard polling
The photographer dashboard polls `GET /events/` every 5 seconds to detect when an event moves from `PROCESSING` to `READY`. This is intentional — it shows the live status without a manual refresh. In production this could be replaced with a WebSocket for efficiency.

### PWA
The app registers a service worker on production (not localhost). It can be installed on mobile as a home screen app — useful for guests at events who want quick access.

---

## Dependencies

| Package | Purpose |
|---|---|
| `next` | React framework with App Router |
| `react` / `react-dom` | UI library |
| `typescript` | Type safety |
| `tailwindcss` | Utility CSS |
| `axios` | HTTP client with upload progress support |
| `qrcode.react` | QR code generation in the dashboard |
| `lucide-react` | Icon set |

---

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Related Services

| Service | Repo | Description |
|---|---|---|
| API Gateway | `scanme-gateway` | All frontend API calls go here first |
| Photographer Service | `scanme-photographer` | Auth and event management |
| Guest Service | `scanme-guest` | Gallery data and selfie matching |
| Ingestion Worker | `scanme-ingestion-worker` | Not called by frontend directly |
