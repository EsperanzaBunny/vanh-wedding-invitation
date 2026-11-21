# Việt Anh & Vân Anh · Wedding invitation concepts

A React invitation with three complete material themes, an interactive envelope, supplied wedding photos, personalized guest links, RSVP and a host dashboard. The names, date, venue, family names and schedule are transcribed from the supplied invitation assets in `src/config.js`. The RSVP deadline is unset because none was supplied.

## Run

Node 20.19+ recommended.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. `npm run build` creates `dist/`. `npm test` runs the server validation/security tests.

Theme URLs:

- `/?style=glass` — Sương mai / Glassmorphism
- `/?style=clay` — Mây hồng / Claymorphism
- `/?style=neu` — Lụa trắng / Neumorphism
- `/?host=1` — host dashboard (also linked in the footer)

The invitation begins with a full-screen four-flap envelope based on the supplied video. Tap the gold seal or scroll to open it. The side flaps carry the seal outward, then the upper and lower flaps fold away. Personalized greeting, couple names and a portrait follow. Continue or scroll to enter the full invitation. The opening can be skipped at any time and replayed from the hero. Host links open directly into management. Playfair Display is used for headings, couple names, invitation greetings and dates, loaded through Google Fonts with normal and italic styles and Vietnamese coverage. Forms, labels and controls use the bundled Be Vietnam Pro. If the external Playfair stylesheet is unavailable, the bundled font provides a complete fallback. Reduced motion is respected. Photos open in keyboard-accessible dialogs. Guests can download a calendar event.

## Wedding details

The supplied cards specify Việt Anh & Vân Anh; Sunday, 27 December 2026; Cung Văn hoá Hữu nghị Việt Xô, 91 Trần Hưng Đạo, Cửa Nam, Hà Nội. Arrival 10:30, ceremony 11:00, banquet 11:15. The supplied venue diagram is included in an expandable section. Edit `src/config.js` to change these details or set an RSVP deadline. Original JPEGs remain in `assets/`; responsive WebP exports are in `public/photos/`. No original photograph is modified.

There are no invented relationship dates or biographies. Story prose is illustrative. The uploaded reference video `assets/7a9f6f3f5a0b24a7db138fc138eb79d4_720w.mp4` was inspected frame by frame. `src/EnvelopeOpening.jsx` rebuilds its opening as four independent SVG/CSS 3D surfaces, with the gold seal attached to the left flap. A WebP still extracted from the supplied video supplies the floral artwork. The video itself is not shipped or played. Timing and reference notes are in `docs/reference-motion.md`.

## Personalized invitations and RSVP

### Demo mode (works immediately)

In the local development server, without backend environment variables, the app explicitly displays a demo notice. Production deployments do not generate browser-only demo invitations or accept browser-only RSVPs; the host dashboard explains missing configuration or connection failure until live storage is available. The host can create personalized links, select a theme, and test replies. Demo links contain a URL-encoded guest name; demo guests and responses are stored in **that browser's localStorage only**. They do not synchronize across devices, prove identity or deliver replies to the couple. Do not use demo links for real invitations. Nothing is silently reported as sent.

### Live mode (Vercel + Supabase)

For deployment without GitHub, follow [the CLI deployment guide](docs/deploy-vercel.md).

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Import this repository into Vercel, using the Vite preset. `vercel.json` supplies the build command and output directory. The root `api/invitations.js` deploys as a Node function.
3. Add the three **server-only** environment variables from `.env.example` to Vercel: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the current `sb_secret_...` key), and a long random `HOST_PASSWORD`. Redeploy after changing variables. Do not prefix secrets with `VITE_`, commit `.env` files, or expose keys in the browser.
4. Open `/?host=1`, enter the host password, and create a guest/household with a name, maximum party size and theme.
5. Copy the resulting private link and send it to that guest. Live links use a random 256-bit token: `/?style=glass&invite=<token>`. Only the matching guest record is returned. The guest name and theme come from that saved record, overriding URL edits; guests cannot switch themes. Named preview links (`?guest=...`) also hide both theme pickers and host navigation, and lock the displayed RSVP name. The host dashboard is opened separately through `/?host=1`; adding `host=1` to a guest URL does not open it. The RSVP name is read-only and linked to that record.
6. Replies update the same record, so guests can change their response. The host can refresh the roster and export CSV. Attendance, party size and message are stored centrally.

Live links are bearer links: anyone holding a link can reply for that household. Keep them private. The system identifies the invitation being answered; it does not verify the physical identity of the person using it. The host password stays in React memory and is required for each privileged API call. All public table access is disabled by row-level security; the Supabase secret key is used only in the function. Existing configurations using the legacy `SUPABASE_SERVICE_ROLE_KEY` still work.

For local live testing, copy `.env.example` to `.env.local`, fill it, and run `npm run dev`. The Vite middleware runs the same API handler. `npm run preview` and plain static hosts serve only the compiled frontend, not the RSVP function.

## Hosting research

Research checked 21 November 2026:

- [Vercel Hobby](https://vercel.com/docs/plans/hobby): a free option for personal, non-commercial projects, with included usage limits. A personal wedding invitation fits that use case; inspect quotas before launch.
- [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js): supports a function in the root `api/` directory, allowing the guest and RSVP API to deploy alongside Vite.
- [Supabase pricing](https://supabase.com/pricing): free tier includes a 500 MB database. Free projects may pause after one week of inactivity. Check project status before sending invitations and before the event; upgrade if you need uninterrupted availability.

Recommended production setup: **Vercel Hobby + Supabase Free**, subject to their current terms and quotas. A `vercel.app` address avoids buying a domain. A custom domain is optional and usually costs money. React still renders HTML/CSS in the browser, but this repository builds and deploys as one app, with editable configuration and no manual page uploading.

A separate private Sites preview was registered (`.openai/hosting.json`), but publication could not proceed because this workspace prohibits the publishing helper from creating `.git`. It is not a live deployment. The Sites static preview configuration would demonstrate frontend/demo mode; production RSVP requires the Vercel function described above.

## Verification

- Production bundle built successfully.
- Backend tests cover host access, token isolation, unknown invitations, party limits, malformed requests, cross-origin writes, secret comparison and CSV formula escaping.
- Compiled UI was exercised in a simulated DOM for theme selection, envelope opening, gallery dialogs, demo RSVP persistence, personalized names and host roster.
- Real-browser visual QA remains unverified: this execution environment blocks local listeners and Chrome launch. Check at 375px, 768px, desktop and landscape before sending real invitations.
- Live Supabase/Vercel integration requires your service credentials and has not been tested against a real database.
