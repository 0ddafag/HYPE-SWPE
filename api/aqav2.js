const DEFAULT_TOKEN = "0xb88339CB7199b77E23DB6E890353E22632Ba630f";
const DEFAULT_ADDRESSES = [
  "0x4E5319dEb1072B01439EE674db5C321d11fd96F8",
  "0xc20699185c15D0a2fD65779BB5d69f5b0B113c00",
];
const HYPEREVM_RPC = "https://rpc.hyperliquid.xyz/evm";
const HYPERCORE_INFO = "https://api.hyperliquid.xyz/info";

export default async function handler(request, response) {
  const token = typeof request.query.token === "string" ? request.query.token : DEFAULT_TOKEN;
  const addresses = (typeof request.query.addresses === "string" ? request.query.addresses.split(",") : DEFAULT_ADDRESSES)
    .map((address) => address.trim())
    .filter((address) => /^0x[a-fA-F0-9]{40}$/.test(address));

  if (!addresses.length || !/^0x[a-fA-F0-9]{40}$/.test(token)) {
    response.status(400).json({ error: "Valid token and address parameters are required" });
    return;
  }

  try {
    const rows = await Promise.all(addresses.map(async (address) => {
      const [evm, core] = await Promise.all([
        readEvmUsdc(token, address),
        readHyperCoreUsdc(address),
      ]);
      return { address, hyperEvmUsdc: evm, hyperCoreUsdc: core, total: evm + core };
    }));

    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    response.status(200).json({
      total: rows.reduce((sum, row) => sum + row.total, 0),
      addresses: rows,
      source: "HyperEVM ERC20 balanceOf + HyperCore spotClearinghouseState",
      caveat: "This is a provisional Coinbase-address balance proxy, not the final AQAv2 eligible-balance formula.",
      asOf: new Date().toISOString(),
    });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "AQAv2 balance lookup failed" });
  }
}

async function readEvmUsdc(token, address) {
  const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
  const upstream = await fetch(HYPEREVM_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: token, data }, "latest"] }),
  });
  if (!upstream.ok) throw new Error(`HyperEVM RPC returned ${upstream.status}`);
  const payload = await upstream.json();
  if (payload.error) throw new Error(payload.error.message || "HyperEVM eth_call failed");
  return Number(BigInt(payload.result || "0x0")) / 1e6;
}

async function readHyperCoreUsdc(address) {
  const upstream = await fetch(HYPERCORE_INFO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "spotClearinghouseState", user: address }),
  });
  if (!upstream.ok) throw new Error(`HyperCore API returned ${upstream.status}`);
  const payload = await upstream.json();
  const balance = Array.isArray(payload.balances)
    ? payload.balances.find((item) => item.coin === "USDC")
    : null;
  return Number(balance?.total || 0);
}
