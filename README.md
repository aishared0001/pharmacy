# MediGo — Chandigarh Pharmacy Delivery

A medicine-delivery-only mobile app for the **Chandigarh** area, built with
**Expo (React Native)** and **Supabase**. Browse a catalogue of medicines, add
to cart, upload a prescription where required, and place a **Cash on Delivery**
order. Every order is emailed to the store owner (with timestamp + delivery
address) and a confirmation is emailed to the customer.

> ⚠️ **Demo / MVP.** Selling medicines online in India is regulated (Drugs &
> Cosmetics Act). A real launch needs a valid drug licence, a registered
> pharmacist to verify prescriptions, and the appropriate approvals. This app
> is a working starting point, not a compliant production pharmacy.

> The catalogue is a **sample** of common generic/OTC medicines with original,
> general information — it is **not** a copy of Apollo Pharmacy's proprietary
> data. Manage the catalogue from the in-app **admin panel**.

## Features

- Customer accounts (email/password) via Supabase Auth
- Catalogue by category, search, and product detail with **description, "Used
  for", and "Common side effects"** (with a not-medical-advice disclaimer)
- Cart with quantity control and free-delivery threshold
- **Chandigarh-only** checkout — PIN codes 160001–160104, enforced in-app *and*
  in the database
- **Prescription upload** required when the cart has Rx medicines
- **Cash on Delivery** only
- Order emailed to the owner + confirmation emailed to the customer
- Order history and live status
- **Admin panel**: add/edit/delete products (with image upload, description,
  uses, side effects) and manage order status

## Tech stack

| Layer     | Choice |
|-----------|--------|
| App       | Expo (React Native), Expo Router, TypeScript |
| State     | Zustand (cart persisted with AsyncStorage) |
| Backend   | Supabase — Postgres, Auth, Storage |
| Email     | Supabase Edge Function (`send-order-email`), Resend by default |
| Images    | Original SVG illustrations per medicine form; real photos upload via admin |

## Prerequisites

- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) project
- The **Expo Go** app on your phone (iOS/Android), or an emulator
- (Optional, for real emails) a [Resend](https://resend.com) account, or use
  Gmail SMTP — see [Email](#5-order-emails)

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

In your Supabase project → **SQL Editor**, run these two files in order:

1. `supabase/migrations/0001_init.sql` — tables, RLS, Chandigarh rule, buckets
2. `supabase/seed/seed_medicines.sql` — 12 categories + ~96 sample medicines

(To regenerate the seed after editing the dataset: `node supabase/seed/generate.mjs`.)

### 3. Configure the app

```bash
cp .env.example .env
```

Fill in from Supabase → **Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Run

```bash
npx expo start
```

Scan the QR code with Expo Go (or press `a`/`i` for an emulator). Register an
account and start browsing.

### 5. Order emails

Orders trigger the `send-order-email` Edge Function. Deploy it and set secrets
with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase functions deploy send-order-email

supabase secrets set OWNER_EMAIL=aishared0001@gmail.com
supabase secrets set FROM_EMAIL="MediGo <onboarding@resend.dev>"
supabase secrets set RESEND_API_KEY=re_your_key   # from resend.com
```

- **Owner email** defaults to `aishared0001@gmail.com` if `OWNER_EMAIL` is unset.
- **Until `RESEND_API_KEY` is set**, the function still runs and **logs** the
  composed email (view it in the Supabase → Edge Functions → Logs) instead of
  sending — so ordering works before email is wired up.
- **Prefer Gmail/SMTP?** Swap the `sendViaResend` implementation in
  `supabase/functions/send-order-email/index.ts` for an SMTP client (e.g.
  `denomailer`) using a Gmail App Password stored as a secret.

### 6. Make yourself an admin

Register in the app, then in Supabase → SQL Editor:

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

Re-open the app → **Profile → Open admin panel**.

## Project structure

```
app/                     Expo Router screens
  (auth)/                login, register
  (tabs)/                home, cart, orders, profile
  product/[id].tsx       product detail (description/uses/side effects)
  category/[slug].tsx    category + search results
  checkout.tsx           address + Chandigarh gate + Rx upload + COD
  order/[id].tsx         order confirmation / detail
  admin/                 product CRUD + order management (admin only)
components/               UI kit, ProductCard, ProductArt (SVG illustrations)
lib/                      supabase client, api, stores, storage, types, format
constants/               theme, chandigarh (delivery-area rule)
supabase/
  migrations/0001_init.sql
  seed/                  seed_medicines.sql + generator
  functions/send-order-email/   Edge Function
```

## How the Chandigarh-only rule works

`constants/chandigarh.ts` restricts delivery to PIN codes **160001–160104**.
The checkout screen blocks anything outside that range, and the `orders` table
has a `CHECK (public.is_chandigarh_pincode(pincode))` constraint so it cannot be
bypassed by a modified client.

## Notes

- Product images: each medicine shows an original SVG illustration for its form
  (tablet, syrup, capsule, tube, drops, …). Upload a real photo per product in
  the admin panel to override it (stored in the public `product-images` bucket).
- Prescriptions are stored in a **private** `prescriptions` bucket; only the
  uploading customer and admins can read them.
