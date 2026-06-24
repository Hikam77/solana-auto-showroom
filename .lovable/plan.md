# Solana Auto Sales — Web3 Car Dealership

A production-ready showroom app with admin management and Solana wallet-based customer checkout in USDC.

## Tech Stack
- TanStack Start (React 19 + TypeScript + Vite) — this project's stack
- TailwindCSS v4 + shadcn/ui
- Lovable Cloud (Supabase) for DB + Storage
- Solana Wallet Adapter (Phantom, Solflare, Backpack) + Solana Web3.js + Solana Pay
- USDC on Solana mainnet (configurable to devnet)

## Routes
**Customer (public, wallet login):**
- `/` — Hero, featured cars, latest cars, promos, dealer stats
- `/catalog` — Card grid, search, filters (brand/year/price/stock)
- `/car/$id` — Gallery, specs, price, stock, Checkout button
- `/checkout/$id` — Wallet connect → USDC payment via Solana Pay → save tx signature
- `/invoice/$invoiceNumber` — View, print, download PDF
- `/my-transactions` — Customer's wallet transaction history

**Admin (no login, demo mode at `/admin`):**
- `/admin` — Dashboard (KPIs + charts: monthly sales, revenue, top cars, blockchain activity)
- `/admin/cars` — CRUD inventory (name, brand, year, color, transmission, fuel, price, stock, desc, photos)
- `/admin/transactions` — Table with search (invoice/wallet), filter (pending/paid/failed), tx hash links
- `/admin/web3` — Crypto analytics dashboard (USDC received, tx count, active wallets, monthly volume)
- `/admin/settings` — Dealer info + receiving Solana wallet

## Database (Lovable Cloud)
Tables exactly as specified: `cars`, `wallet_users`, `transactions`, `transaction_items`, `settings`.
- RLS: cars/settings public read; transactions readable by matching wallet; admin writes via service-role server functions (admin is demo/open per spec).
- Storage bucket `car-images` (public) for car photos and dealer logo.
- Seed 8 cars from spec.

## Checkout Flow
1. Connect wallet (Phantom/Solflare/Backpack)
2. Show SOL + USDC balance
3. Create invoice `INV-YYYYMMDD-XXX` (server fn)
4. Convert IDR → USDC (live rate via CoinGecko, fallback fixed)
5. Build Solana Pay USDC SPL transfer to dealer wallet
6. Wallet signs/sends → capture signature
7. Server fn verifies signature on-chain → marks PAID, decrements stock, finalizes invoice

## Design
Premium automotive feel — dark hero, sharp typography (Space Grotesk + Inter), red/black accent palette inspired by Tesla/Carsome. Semantic tokens in `src/styles.css`, custom Button variants. No purple, no generic gradients.

## Technical Notes
- Solana libs: `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-wallets`, `@solana/wallet-adapter-react-ui`, `@solana/spl-token`, `@solana/pay`, `bignumber.js`
- PDF: `jspdf` + `jspdf-autotable`
- Charts: `recharts` (already typical with shadcn)
- All wallet code wrapped in `<ClientOnly>` / dynamic to avoid SSR `window` issues
- Network: devnet by default (env-configurable) so testing works without real funds; switchable to mainnet via setting
- Every route: loading state, error boundary, notFoundComponent

## Out of Scope (clarify if needed)
- Real on-chain verification uses RPC; default to public devnet RPC. Mainnet recommended switch later.
- Admin is open (no auth) per spec — flagged as demo-only.

Approve and I'll build it end-to-end: enable Cloud → migrations + seed → install deps → design system → all routes + components → wallet/checkout → PDF/invoice → verify build.
