
# Varadhi (వారధి) — Build Plan

Marketplace + services platform under `/varadhi/*` on the same MBR Platform project (shared Supabase, shared auth). Telugu-first UI with English toggle. Mobile-first, clean card layout matching the reference mockup (green/blue/orange category tiles, white cards, bottom tab bar).

---

## 1. Branding & shell

- Route tree under `/varadhi` (rename current placeholder). Public routes: `/varadhi`, `/varadhi/auth`, `/varadhi/browse/*`, `/varadhi/item/$id`, `/varadhi/provider/$id`. Authenticated under `/_authenticated/varadhi.*`.
- Logo: use the uploaded V/A monogram (orange + navy). Save via lovable-assets.
- Palette: navy `#1e3a8a`, orange `#f97316`, green `#16a34a` category, off-white bg. Rounded 2xl cards, soft shadows, bottom nav (Home / Search / Post / Chat / Profile).
- Language: reuse existing `i18n.tsx` (`lt(en, te)`). Default Telugu.
- Persistent legal disclaimer in footer + auth screen.

## 2. Auth & roles

- Mobile + OTP via Supabase Phone Auth (SMS provider prompt shown to admin — MSG91/Twilio secret). Fallback to email OTP if phone provider not configured.
- New table `varadhi_profiles`: user_id (PK, FK auth.users), full_name, phone, primary_role (`seller|buyer|provider`), business_name, address, lat, lng, aadhaar_url, license_url, store_photo_url, verification_status (`pending|approved|rejected`), created_at.
- Onboarding wizard: role → details → proof uploads (Supabase Storage bucket `varadhi-proofs`, private) → Google Maps location picker (existing Google Maps connector) → submit.

## 3. Seller listings

- `varadhi_listings`: id, seller_id, category (`fresh|new|used|realestate`), sub_category, title, description, price, unit, images[] (storage `varadhi-listings`), lat, lng, city, stock_status (`running|closed`), click_count, created_at.
- Seller dashboard: add/edit listing, toggle RUNNING/CLOSED, view click count, stock hidden from search when closed.

## 4. Transport & service providers

- `varadhi_providers`: id, user_id, provider_type (`transport|service`), sub_type (2w, 3w, 4w, 6w, electrician, plumber, mechanic, tractor, etc.), vehicle_details, service_areas, availability_status (`online|offline`), rating_avg, click_count, subscription_expires_at.
- Toggle ONLINE/OFFLINE from dashboard. OFFLINE hidden from buyer search.

## 5. Buyer flow

- Home: category grid (Fresh / New / Used / Real Estate / Transport / Services) matching mockup style.
- List view: thumbnail, title, price, distance (haversine from buyer's lat/lng), category badge. Contact hidden.
- Detail view: full seller info, call/WhatsApp buttons (`tel:`, `wa.me/`), gallery, map. Increments `click_count` via server fn `logListingClick`.
- On detail page: nearby ONLINE transport providers within 5 km (SQL `earth_distance` or simple bounding box).
- Rewards: `varadhi_rewards` (user_id, points, source, created_at). Dashboard with balance + redeem button (redeem = server fn, placeholder for now).

## 6. Subscriptions

- `varadhi_subscriptions`: user_id, plan (`1m|3m|6m|1y`), amount, starts_at, expires_at, payment_ref, status.
- Plan selector screen (₹300 / ₹800 / ₹1500 / ₹2500 defaults, admin editable).
- Payment: reuse existing MBR Stripe/Paddle if enabled; otherwise placeholder "Mark as Paid" for admin verification (Razorpay/UPI can be added on request — noting Stripe/Paddle are the built-in options).
- Middleware: providers/sellers listing hidden once `expires_at < now()`.

## 7. Admin

- `/admin/varadhi` panel (gated by existing super_admin role):
  - Pending verifications queue (approve/reject proofs).
  - Listings & providers moderation.
  - Click/inquiry analytics per listing & provider.
  - Auto "Top Rated" / "Most Inquired" badges (top 10% by click_count in category).
  - Subscription expiry tracker.

## 8. Database migration (single file)

Tables above + RLS:
- `varadhi_profiles`: owner read/write own; approved profiles readable by authenticated for provider search.
- `varadhi_listings`: owner CRUD; `running` rows selectable by authenticated.
- `varadhi_providers`: owner CRUD; `online` + subscription-active rows selectable by authenticated.
- `varadhi_subscriptions`, `varadhi_rewards`: owner read; service_role write.
- `varadhi_clicks` (id, target_type, target_id, buyer_id, ts) for analytics.
- GRANTs to authenticated + service_role on every table.
- Storage buckets: `varadhi-proofs` (private, signed URLs), `varadhi-listings` (public read).

## 9. Server functions (`src/lib/varadhi.functions.ts`)

`upsertVaradhiProfile`, `submitVerification`, `listListings(category, near)`, `getListing(id)`, `logListingClick(id)`, `upsertListing`, `toggleListingStock`, `listProviders(subType, near)`, `toggleProviderAvailability`, `getRewards`, `redeemRewards`, `listPlans`, `createSubscription`, `adminListPending`, `adminApproveProfile`, `adminAnalytics`.

All authenticated via `requireSupabaseAuth`; public browse fn uses server publishable client with narrow anon SELECT policy on `running` listings.

## 10. Deliverables (in order)

1. Supabase migration (schema, RLS, GRANTs, buckets).
2. `src/lib/varadhi.functions.ts` server fns.
3. Route tree under `/varadhi/*` (public + `_authenticated/varadhi.*`).
4. Shell components: bottom nav, category grid, listing card, provider card, map picker.
5. Onboarding wizard + verification flow.
6. Seller dashboard (add/edit listing, stock toggle).
7. Provider dashboard (availability toggle, subscription status).
8. Buyer browse + detail + nearby-transport suggestion.
9. Rewards + subscription screens.
10. Admin `/admin/varadhi` panel.
11. Playwright smoke: register seller → add listing → buyer browse → click detail → click count logs.

---

## Open questions before I start

1. **OTP provider**: Do you have an SMS gateway (MSG91 / Twilio) API key? If not, I'll use email OTP with a "phone number to be verified later" field so we can ship now and swap SMS in later.
2. **Payment gateway**: Use existing MBR Stripe/Paddle, or defer subscription payments to a later "Mark Paid" admin-approval flow?
3. **Google Maps connector**: The MBR project already has it — okay to reuse the same connection for Varadhi map picker + distance search?

Reply "go" and I'll start with the migration + server fns.
