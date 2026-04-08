export default async function handler(request, response) {
  const requestedPath = Array.isArray(request.query.path)
    ? request.query.path[0]
    : request.query.path;
  const upstreamPath = requestedPath || "/unstakingQueue";

  try {
    const root = "https://api.hypurrscan.io";
    const normalizedPath = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
    const upstream = await fetch(`${root}${normalizedPath}`);

    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: `Hypurrscan returned ${upstream.status}`,
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
