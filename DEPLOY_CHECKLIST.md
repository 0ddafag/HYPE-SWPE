# Vercel Deploy Checklist

Use this right after you import the repo into Vercel.

## Before Deploy

1. Import the GitHub repo into Vercel.
2. Framework preset: leave it as `Other`.
3. Root directory: use this folder.
4. Build command: leave empty.
5. Output directory: leave empty.
6. Optional environment variable: `COINGECKO_DEMO_API_KEY`

## Post-Deploy 1-Minute Check

Replace `YOUR_DOMAIN` below with the Vercel URL.

### 1. Check CoinGecko Proxy

Open:

```text
https://YOUR_DOMAIN/api/coingecko?path=/coins/hyperliquid?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false
```

Expected:

- JSON response
- contains `market_data`

### 2. Check DefiLlama Proxy

Open:

```text
https://YOUR_DOMAIN/api/defillama?path=/summary/fees/hyperliquid?dataType=dailyHoldersRevenue
```

Expected:

- JSON response
- contains `totalDataChart`

### 3. Check Hypurrscan Proxy

Open:

```text
https://YOUR_DOMAIN/api/hypurrscan?path=/unstakingQueue
```

Expected:

- JSON array
- each item has `time`, `user`, and `wei`

### 4. Check Hyperliquid Proxy

Run:

```bash
curl -X POST "https://YOUR_DOMAIN/api/hyperliquid" \
  -H "content-type: application/json" \
  -d '{"type":"delegatorSummary","user":"0x43e9abea1910387c4292bca4b94de81462f8a251"}'
```

Expected:

- JSON response
- contains `delegated`

### 5. Check the Dashboard

Open the homepage and confirm:

- the chart loads
- `Current SWPE` is not blank
- `Revenue 30d EMA` is not blank
- the market snapshot pill mentions live free-source data
- switching `Supply basis` changes the SWPE value
- hover tooltip shows date, SWPE, mean, and revenue

## If Something Fails

- If CoinGecko fails, add `COINGECKO_DEMO_API_KEY` and redeploy.
- If a proxy route fails, open the Vercel function logs for that route.
- If the dashboard loads but cards are blank, check the browser network tab for `/api/coingecko`, `/api/defillama`, `/api/hyperliquid`, and `/api/hypurrscan`.
