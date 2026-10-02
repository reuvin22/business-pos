# my-business-pos

The selling app (point of sale) for businesses on **SIRIS — Supplier Inventory & Retail Integration System**. Sellers sign in with the account the
business created for them (main app → Team → Sellers), sell the business's products at the counter
(paid in cash or by e-wallet), and see the recent stock changes at their store. Every sale takes the quantity out of the same inventory the
main app shows, and both apps update live.

React + TypeScript + Vite + Tailwind, like `my-business-fe`. It talks to the same API (`my-business-be`)
and the same Firebase project.

## Getting started

```bash
npm install
cp .env.example .env.local   # same Firebase values as my-business-fe, and VITE_API_URL
npm run dev                  # http://localhost:5174
```

Add the selling app's address to the backend's `CORS_ORIGINS` (e.g. `http://localhost:5174` and your
deployed URL), and to Firebase Console → Authentication → Settings → Authorized domains.
In the main app, set `VITE_POS_URL` to the deployed address so the Sellers section links to it.

## Pages

| Page | What it does |
| ---- | ------------ |
| `/login` | Email + password (seller accounts), or Google for owners. |
| `/` | Pick the business (skipped when you sell for only one). Then pick the store if you may use several. |
| `/shop/:id` (Sell) | Tap products (or scan a barcode into the search box and press Enter). Cart, total, cash and change, Charge, printable receipt. |
| `/shop/:id/stock` | Recent stock changes at this store (sales, deliveries, corrections), updated live. Stock in/out is recorded in the main app. |
| `/shop/:id/receipts` | Receipts and totals for one day, or **All dates** (the newest 500). Open one to print it again or void it (stock goes back). |
| `/account` | Change your password. |

## Folder structure

```
src/
  api/            client.ts (fetch + login token), pos.ts (the endpoints), types.ts
  hooks/          useLiveStock (live stock of one store), useCatalog (products + prices, reloads when they change),
                  useCart (saved in the browser), useLoad
  utils/          items.ts (products → sellable items, price tiers), labels.ts, format.ts
  components/     CartPanel, ReceiptView, ui.tsx (Loading, ErrorBox, Modal, LiveBadge...)
  pages/          ShopLayout (business, store, header) and one file per page
  shopContext.ts  what ShopLayout shares with the pages (useShop())
  styles.ts       shared Tailwind class lists
```

## How "live" works

`useLiveStock` listens to `businesses/{id}/inventory` in Firestore (read only). The backend's
`firestore.rules` must be deployed for this; until then the app asks the API every 10 seconds, and the
header badge says **Refreshing** instead of **Live**. All changes (sales, voids) go through
the API, which checks permissions and writes the stock history.

## Deploy (Vercel)

Import the folder as a new Vercel project (framework: Vite). Add the `VITE_*` variables from `.env.example`.
`vercel.json` sends every path to `index.html`, so page links work after a reload.
