# HYPE SWPE Dashboard

Quick links:

- `GITHUB_PUSH.md` for the clean first-commit flow
- `DEPLOY_CHECKLIST.md` for the 1-minute Vercel verification routine

This is a static dashboard for tracking three HYPE valuation views on one combined chart, plus a forward AQAv2 scenario chart:

- SWPE ratio
- Mean SWPE
- 30d EMA Hyperliquid revenue
- AQAv2-adjusted SWPE and revenue projection

## AQAv2 forward scenario

The second chart is a scenario, not realized historical revenue. Its defaults follow the current Hyperliquid AQA documentation and public reporting:

- activation date: `2026-08-26`;
- USDC balance: live provisional Coinbase-address proxy (HyperEVM ERC-20 + HyperCore spot USDC), with a `$4.901B` verified snapshot fallback;
- cost-adjusted reserve yield: `3.25%` (editable assumption, based on current public reporting);
- protocol share: `90%`;
- reserve yield accrues in 30-day intervals from 2026-08-26; public launch reporting gives 2026-10-03 as the first payment date, after the documented 8-day post-interval lag.

The balance proxy uses the two Coinbase activation addresses published by Coinbase:

- `0x4E5319dEb1072B01439EE674db5C321d11fd96F8`
- `0xc20699185c15D0a2fD65779BB5d69f5b0B113c00`

It is explicitly provisional: it is not yet the final AQAv2 eligible-balance formula.

The model starts distributing the first 30-day batch on 2026-10-03 and spreads each batch evenly across the following 30 days (`batch / 30`). This avoids an artificial monthly jump while preserving the same total flow. It extends the chart one year forward while holding current HYPE price and supply flat. Change the inputs to test different TVL, yield, share, or payment timing.

Reference: [Hyperliquid Aligned Quote Assets](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/aligned-quote-assets), [Circle on USDC and Hyperliquid](https://www.circle.com/blog/circle-expands-support-for-usdc-on-hyperliquid).


The workspace does not rely on Node, npm, or paid API infrastructure. It is designed around a cheap workflow:

- CoinGecko for price and supply
- DefiLlama for daily holders revenue
- Hyperliquid public staking endpoints for total staked and excluded-wallet checks
- Hypurrscan for the unstaking queue
- optional historical CSV inputs if you want a custom series

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000
```

## Continuous updates without enterprise APIs

Use a two-part setup:

- live free-source fetches on page load or button click
- optional `data/hype-history.csv` only if you want to override the built-in free-source history

How it works:

- The dashboard tries to load `data/hype-history.csv` automatically on startup.
- If that file is missing, it builds the chart from free live sources:
  - DefiLlama `dailyHoldersRevenue`
  - CoinGecko price and market data
  - Hyperliquid `validatorSummaries` and `delegatorSummary`
  - Hypurrscan `unstakingQueue`
- On Vercel, those requests can be routed through the local `api/` functions so the browser does not depend on direct third-party CORS behavior.

Do you need `data/hype-history.csv`?

- `No`, not for the current version. The site can now assemble the chart from free APIs on its own.
- `Yes`, only if you want to pin or customize a historical series beyond what the free live sources provide.
- Think of `data/hype-history.csv` as an optional override, not a requirement.

If you want full automation later, the cheapest practical option is still a small daily cron job or GitHub Action that rewrites `data/hype-history.csv`, but it is no longer required just to keep the site live.

## Public website on Vercel

Simplest setup:

1. Push this folder to a GitHub repo.
2. Import the repo into Vercel as a static site project.
3. Optionally add `COINGECKO_DEMO_API_KEY` in Vercel project environment variables.
4. Deploy.
5. Each commit to `main` triggers a fresh Vercel deployment automatically.

Recommended architecture:

- `Vercel` hosts the static dashboard.
- `api/coingecko.js` proxies CoinGecko through Vercel.
- `api/defillama.js` proxies DefiLlama through Vercel.
- `api/hyperliquid.js` proxies Hyperliquid staking reads through Vercel.
- `api/hypurrscan.js` proxies Hypurrscan through Vercel.
- `GitHub Actions` is optional for future historical snapshots or backups.

Why the Vercel proxy layer matters:

- it keeps the browser on same-origin requests in production
- it reduces the chance that third-party CORS changes break the site
- it lets you keep a CoinGecko Demo key server-side if you want one

### Local Vercel-style testing

If you want to test the `api/` functions locally before deploying:

```bash
vercel dev
```

Then open the local URL that Vercel prints.

### Environment variables

Optional:

- `COINGECKO_DEMO_API_KEY`

If it is missing, the CoinGecko proxy still attempts the public endpoint first. Add the key only if you want better reliability against public rate limits.

## Historical CSV columns

Minimum real-data inputs for this dashboard:

- `BUYBACKS` or `REVENUE`
- `CIRCULATING_SUPPLY_NATIVE`
- optional `STAKED_HYPE` if you want exact Ready-for-Sale float instead of the UI fallback percentage

Price history does not have to come from the same source. If it is missing, the dashboard tries CoinGecko daily prices.

The dashboard accepts uploaded CSVs with any subset of these columns:

- `date`
- `buybacks`
- `revenue`
- `buyback_fee_allocation`
- `fees`
- `price`
- `circulating_supply_native`
- `staked_hype`

There is also a starter file at `data/hype-history.example.csv`.

Fallback rules:

- Buyback revenue prefers `buybacks`, then `buyback_fee_allocation`, then `revenue`, then `fees * buybackShare`
- Ready-for-Sale supply = `circulating_supply_native - staked_hype`
- If staking data is missing, the dashboard uses the default staked percentage from the UI
- If price history is missing, the dashboard tries CoinGecko historical prices before falling back to the current input price
- Mean SWPE is drawn as a flat line using the currently selected chart timeframe

## CoinGecko defaults baked into the UI

The initial form state uses the Hyperliquid CoinGecko snapshot referenced on April 7, 2026:

- Price: `36.44`
- Circulating supply: `238,385,315`
- Total supply: `962,274,028`

Those fields are just fallbacks now. In normal use, refresh them from CoinGecko live.
