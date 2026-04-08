export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({
      error: "Method not allowed",
    });
    return;
  }

  try {
    const upstream = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.body || {}),
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: `Hyperliquid returned ${upstream.status}`,
      });
      return;
    }

    const payload = await upstream.json();
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    response.status(200).json(payload);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Unknown proxy failure",
    });
  }
}
