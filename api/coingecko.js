export default async function handler(request, response) {
  const apiKey = process.env.COINGECKO_DEMO_API_KEY;

  const requestedPath = Array.isArray(request.query.path)
    ? request.query.path[0]
    : request.query.path;
  const upstreamPath = requestedPath || "/coins/hyperliquid?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";

  try {
    const root = "https://api.coingecko.com/api/v3";
    const normalizedPath = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
    const upstream = await fetch(`${root}${normalizedPath}`, {
      headers: apiKey
        ? {
            "x-cg-demo-api-key": apiKey,
          }
        : {},
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: `CoinGecko returned ${upstream.status}`,
      });
      return;
    }

    const payload = await upstream.json();
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
    response.status(200).json(payload);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unknown proxy failure",
    });
  }
}
