const DAY_MS = 24 * 60 * 60 * 1000;
const EMA_PERIOD = 30;
const LOCAL_STORAGE_KEY = "hype-swpe-settings";
const COINGECKO_DEMO_URL = "https://api.coingecko.com/api/v3/coins/hyperliquid";
const COINGECKO_PROXY_URL = "/api/coingecko";
const COINGECKO_COIN_PATH = "/coins/hyperliquid?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false";
const COINGECKO_MARKET_CHART_PATH = "/coins/hyperliquid/market_chart?vs_currency=usd&days=365&interval=daily";
const DEFILLAMA_PROXY_URL = "/api/defillama";
const DEFILLAMA_HOLDERS_REVENUE_URL = "https://api.llama.fi/summary/fees/hyperliquid?dataType=dailyHoldersRevenue";
const HYPERLIQUID_PROXY_URL = "/api/hyperliquid";
const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
const HYPURRSCAN_PROXY_URL = "/api/hypurrscan";
const HYPURRSCAN_UNSTAKING_URL = "https://api.hypurrscan.io/unstakingQueue";
const AQAV2_BALANCE_PROXY_URL = "/api/aqav2";
const AQAV2_USDC_TOKEN = "0xb88339CB7199b77E23DB6E890353E22632Ba630f";
const AQAV2_TREASURY_ADDRESSES = [
  "0x4E5319dEb1072B01439EE674db5C321d11fd96F8",
  "0xc20699185c15D0a2fD65779BB5d69f5b0B113c00",
];
const EXCLUDED_STAKING_WALLETS = [
  {
    label: "HyperLabs wallet",
    address: "0x43e9abea1910387c4292bca4b94de81462f8a251",
  },
  {
    label: "Foundation wallet",
    address: "0xd57ecca444a9acb7208d286be439de12dd09de5d",
  },
];
const RANGE_DAYS = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "60d": 60,
  "180d": 180,
  "1y": 365,
};

const DEFAULTS = {
  supplyMode: "ready",
  currentPrice: 36.44,
  circulatingSupply: 238385315,
  totalSupply: 962274028,
  defaultStakedPct: 66.1,
  buybackShare: 0.99,
  aqaActivationDate: "2026-08-26",
  usdcBalance: 4901099263.15,
  reserveYieldRate: 0.0325,
  aqaProtocolShare: 0.9,
  buybackPaymentLag: 8,
  coingeckoSnapshotDate: "2026-04-07",
  autoRefreshMode: "disabled",
  coingeckoApiKey: "",
};

const elements = {
  supplyMode: document.querySelector("#supplyMode"),
  currentPrice: document.querySelector("#currentPrice"),
  circulatingSupply: document.querySelector("#circulatingSupply"),
  totalSupply: document.querySelector("#totalSupply"),
  defaultStakedPct: document.querySelector("#defaultStakedPct"),
  buybackShare: document.querySelector("#buybackShare"),
  coingeckoApiKey: document.querySelector("#coingeckoApiKey"),
  autoRefreshMode: document.querySelector("#autoRefreshMode"),
  aqaActivationDate: document.querySelector("#aqaActivationDate"),
  usdcBalance: document.querySelector("#usdcBalance"),
  reserveYieldRate: document.querySelector("#reserveYieldRate"),
  aqaProtocolShare: document.querySelector("#aqaProtocolShare"),
  buybackPaymentLag: document.querySelector("#buybackPaymentLag"),
  csvFile: document.querySelector("#csvFile"),
  reloadButton: document.querySelector("#reloadButton"),
  refreshMarketButton: document.querySelector("#refreshMarketButton"),
  demoButton: document.querySelector("#demoButton"),
  currentSwpe: document.querySelector("#currentSwpe"),
  currentSwpeMeta: document.querySelector("#currentSwpeMeta"),
  currentMeanSwpe: document.querySelector("#currentMeanSwpe"),
  meanSwpeMeta: document.querySelector("#meanSwpeMeta"),
  currentRevenue: document.querySelector("#currentRevenue"),
  currentRevenueMeta: document.querySelector("#currentRevenueMeta"),
  supplyModeLabel: document.querySelector("#supplyModeLabel"),
  supplyModeMeta: document.querySelector("#supplyModeMeta"),
  sourceLabel: document.querySelector("#sourceLabel"),
  marketSnapshotLabel: document.querySelector("#marketSnapshotLabel"),
  marketCapReference: document.querySelector("#marketCapReference"),
  fdvReference: document.querySelector("#fdvReference"),
  combinedChart: document.querySelector("#combinedChart"),
  adjustedChart: document.querySelector("#adjustedChart"),
  priceChart: document.querySelector("#priceChart"),
  timeframeRow: document.querySelector("#timeframeRow"),
};

let rawRows = buildDemoRows();
let sourceLabel = "Built-in demo dataset";
let marketSnapshotLabel = `CoinGecko defaults from ${formatDateLong(new Date(`${DEFAULTS.coingeckoSnapshotDate}T00:00:00Z`))}`;
let selectedRange = "180d";
let historicalPriceMap = new Map();
let historicalCirculatingMap = new Map();
let liveSnapshot = createLiveSnapshot();
let hoverSyncState = {
  combined: null,
  price: null,
  adjusted: null,
  isSyncing: false,
};

initialize();

async function initialize() {
  seedInputs();
  attachEvents();
  syncTimeframeButtons();
  const hasLocalHistory = await loadLocalHistoryIfAvailable();
  await loadFreeData({
    replaceSeries: !hasLocalHistory,
    silent: true,
  });
  await loadHistoricalPricesIfNeeded();
  renderDashboard();
}

function seedInputs() {
  const saved = readSavedSettings();
  elements.supplyMode.value = saved.supplyMode ?? DEFAULTS.supplyMode;
  elements.currentPrice.value = saved.currentPrice ?? DEFAULTS.currentPrice;
  elements.circulatingSupply.value = saved.circulatingSupply ?? DEFAULTS.circulatingSupply;
  elements.totalSupply.value = saved.totalSupply ?? DEFAULTS.totalSupply;
  elements.defaultStakedPct.value = saved.defaultStakedPct ?? DEFAULTS.defaultStakedPct;
  elements.buybackShare.value = saved.buybackShare ?? DEFAULTS.buybackShare;
  elements.coingeckoApiKey.value = saved.coingeckoApiKey ?? DEFAULTS.coingeckoApiKey;
  elements.autoRefreshMode.value = saved.autoRefreshMode ?? DEFAULTS.autoRefreshMode;
  elements.aqaActivationDate.value = saved.aqaActivationDate ?? DEFAULTS.aqaActivationDate;
  elements.usdcBalance.value = saved.usdcBalance ?? DEFAULTS.usdcBalance;
  elements.reserveYieldRate.value = saved.reserveYieldRate ?? DEFAULTS.reserveYieldRate;
  elements.aqaProtocolShare.value = saved.aqaProtocolShare ?? DEFAULTS.aqaProtocolShare;
  elements.buybackPaymentLag.value = saved.buybackPaymentLag ?? DEFAULTS.buybackPaymentLag;
}

function attachEvents() {
  elements.reloadButton.addEventListener("click", () => {
    persistSettings();
    renderDashboard();
  });

  elements.refreshMarketButton.addEventListener("click", async () => {
    persistSettings();
    await loadFreeData({
      replaceSeries: !hasUploadedHistory(),
      silent: false,
    });
    await loadHistoricalPricesIfNeeded();
    renderDashboard();
  });

  elements.demoButton.addEventListener("click", () => {
    rawRows = buildDemoRows();
    sourceLabel = "Built-in demo dataset";
    marketSnapshotLabel = `CoinGecko defaults from ${formatDateLong(new Date(`${DEFAULTS.coingeckoSnapshotDate}T00:00:00Z`))}`;
    historicalPriceMap = new Map();
    historicalCirculatingMap = new Map();
    liveSnapshot = createLiveSnapshot();
    elements.csvFile.value = "";
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    seedInputs();
    renderDashboard();
  });

  elements.supplyMode.addEventListener("change", () => {
    persistSettings();
    renderDashboard();
  });
  window.addEventListener("resize", debounce(renderDashboard, 100));

  [
    elements.currentPrice,
    elements.circulatingSupply,
    elements.totalSupply,
    elements.defaultStakedPct,
    elements.buybackShare,
    elements.coingeckoApiKey,
    elements.autoRefreshMode,
    elements.aqaActivationDate,
    elements.usdcBalance,
    elements.reserveYieldRate,
    elements.aqaProtocolShare,
    elements.buybackPaymentLag,
  ].forEach((input) => {
    input.addEventListener("change", persistSettings);
    input.addEventListener("input", debounce(persistSettings, 150));
  });

  elements.timeframeRow.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRange = button.dataset.range;
      syncTimeframeButtons();
      renderDashboard();
    });
  });

  elements.csvFile.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text)
        .map(normalizeRow)
        .filter(Boolean);

      if (!parsed.length) {
        throw new Error("No usable rows found in the CSV.");
      }

      rawRows = parsed;
      sourceLabel = `Uploaded historical CSV: ${file.name}`;
      await loadHistoricalPricesIfNeeded();
      renderDashboard();
    } catch (error) {
      window.alert(`CSV import failed: ${error.message}`);
    }
  });
}

function getConfig() {
  return {
    supplyMode: elements.supplyMode.value,
    currentPrice: Number(elements.currentPrice.value) || DEFAULTS.currentPrice,
    circulatingSupply: Number(elements.circulatingSupply.value) || DEFAULTS.circulatingSupply,
    totalSupply: Number(elements.totalSupply.value) || DEFAULTS.totalSupply,
    defaultStakedPct: (Number(elements.defaultStakedPct.value) || DEFAULTS.defaultStakedPct) / 100,
    buybackShare: Number(elements.buybackShare.value) || DEFAULTS.buybackShare,
    aqaActivationDate: elements.aqaActivationDate.value || DEFAULTS.aqaActivationDate,
    usdcBalance: Number(elements.usdcBalance.value) || DEFAULTS.usdcBalance,
    reserveYieldRate: Number(elements.reserveYieldRate.value) || DEFAULTS.reserveYieldRate,
    aqaProtocolShare: Number(elements.aqaProtocolShare.value) || DEFAULTS.aqaProtocolShare,
    buybackPaymentLag: Number(elements.buybackPaymentLag.value) || DEFAULTS.buybackPaymentLag,
  };
}

function renderDashboard() {
  const config = getConfig();
  const series = computeSeries(rawRows, config);
  const current = series.at(-1);
  const visibleSeries = filterSeriesByRange(series, selectedRange);
  const chartSeries = visibleSeries.filter((row) =>
    Number.isFinite(row.swpe) &&
    Number.isFinite(row.meanSwpe) &&
    Number.isFinite(row.revenueEma30) &&
    Number.isFinite(row.price)
  );
  const visibleMean = average(chartSeries.map((row) => row.swpe));
  const xLabelIndices = buildXAxisLabelIndices(chartSeries.length, 6);

  if (!current || !chartSeries.length) {
    return;
  }

  elements.currentSwpe.textContent = formatNumber(current.swpe, 2);
  elements.currentSwpeMeta.textContent = `${formatSupplyMode(config.supplyMode)} market cap = ${formatCompactCurrency(current.selectedMarketCap)}`;
  elements.currentMeanSwpe.textContent = formatNumber(visibleMean, 2);
  elements.meanSwpeMeta.textContent = `Flat ${selectedRange} average across ${chartSeries.length} observations`;
  elements.currentRevenue.textContent = formatCompactCurrency(current.revenueEma30);
  elements.currentRevenueMeta.textContent = getRevenueMeta(current);
  elements.supplyModeLabel.textContent = formatSupplyMode(config.supplyMode);
  elements.supplyModeMeta.textContent = getSupplyModeDescription(config.supplyMode, current);
  elements.sourceLabel.textContent = sourceLabel;
  elements.marketSnapshotLabel.textContent = marketSnapshotLabel;
  elements.marketCapReference.textContent = formatCompactCurrency(config.currentPrice * config.circulatingSupply);
  elements.fdvReference.textContent = formatCompactCurrency(config.currentPrice * config.totalSupply);

  renderDualAxisChart(elements.combinedChart, {
    data: chartSeries,
    swpeValue: current.swpe,
    meanValue: visibleMean,
    revenueValue: current.revenueEma30,
    xLabelIndices,
  });

  const adjustedSeries = buildAdjustedProjection(series, config);
  renderDualAxisChart(elements.adjustedChart, {
    data: adjustedSeries,
    swpeValue: adjustedSeries.at(-1)?.swpe ?? current.swpe,
    meanValue: average(adjustedSeries.map((row) => row.swpe)),
    revenueValue: adjustedSeries.at(-1)?.revenueEma30 ?? current.revenueEma30,
    xLabelIndices: buildXAxisLabelIndices(adjustedSeries.length, 6),
    adjusted: true,
    syncKey: "adjusted",
    scenarioLabel: getAdjustedScenarioLabel(config),
  });

  renderPriceChart(elements.priceChart, {
    data: chartSeries,
    priceValue: current.price,
    xLabelIndices,
  });
}

function buildXAxisLabelIndices(length, count) {
  if (!length) {
    return [];
  }

  const labelCount = Math.min(count, length);
  return Array.from({ length: labelCount }, (_, index) =>
    Math.round((index / Math.max(labelCount - 1, 1)) * (length - 1))
  );
}

function computeSeries(rows, config) {
  const sorted = [...rows].sort((a, b) => a.date - b.date);
  const alpha = 2 / (EMA_PERIOD + 1);
  let prevEma = null;
  const computed = sorted.map((row, index) => {
    const isLast = index === sorted.length - 1;
    const historicalPrice = finiteOr(row.price, getHistoricalPriceForDate(row.date));
    const price = isLast ? config.currentPrice : finiteOr(historicalPrice, config.currentPrice);
    const historicalCirculating = finiteOr(row.circulating_supply_native, getHistoricalCirculatingForDate(row.date));
    const circulatingSupply = isLast ? config.circulatingSupply : finiteOr(historicalCirculating, config.circulatingSupply);
    const stakedHype = resolveStakedHype({
      row,
      config,
      circulatingSupply,
      isLast,
    });
    const readySupply = Math.max(circulatingSupply - stakedHype, 0);
    const buybackRevenue =
      finiteOr(row.buybacks, null) ??
      finiteOr(row.buyback_fee_allocation, null) ??
      finiteOr(row.revenue, null) ??
      (Number.isFinite(row.fees) ? row.fees * config.buybackShare : null);

    if (Number.isFinite(buybackRevenue)) {
      prevEma = prevEma === null
        ? buybackRevenue
        : (buybackRevenue * alpha) + (prevEma * (1 - alpha));
    } else if (prevEma === null) {
      prevEma = 0;
    }

    const selectedSupply = selectSupply(config.supplyMode, {
      circulatingSupply,
      readySupply,
    });
    const selectedMarketCap = selectedSupply * price;
    const annualizedRevenue = prevEma * 365;
    const swpe = annualizedRevenue > 0 ? selectedMarketCap / annualizedRevenue : 0;

    return {
      ...row,
      date: row.date,
      price,
      circulatingSupply,
      stakedHype,
      readySupply,
      buybackRevenue,
      revenueEma30: prevEma,
      annualizedRevenue,
      selectedSupply,
      selectedMarketCap,
      swpe,
    };
  });

  const meanSwpe = average(computed.map((row) => row.swpe));
  return computed.map((row) => ({
    ...row,
    meanSwpe,
  }));
}

function buildAdjustedProjection(series, config) {
  const current = series.at(-1);
  if (!current) {
    return [];
  }

  const activationDate = getUtcMidnight(new Date(`${config.aqaActivationDate}T00:00:00Z`));
  const firstDate = new Date(current.date.getTime() - (59 * DAY_MS));
  const horizonDays = 365;
  const dailyYield = config.usdcBalance * config.reserveYieldRate * config.aqaProtocolShare / 365;
  const paymentIntervalDays = 30;
  // Public launch reporting says the first Assistance Fund payment is 3 Oct
  // 2026 for the 26 Aug activation. Keep the lag input, but use the explicit
  // reported first-payment convention rather than creating an Oct 2 spike
  // from an off-by-one calendar calculation.
  const firstPaymentDate = new Date(activationDate.getTime() + ((paymentIntervalDays + config.buybackPaymentLag) * DAY_MS));
  let ema = series.find((row) => toDateKey(row.date) === toDateKey(firstDate))?.revenueEma30 ?? current.revenueEma30;
  const alpha = 2 / (EMA_PERIOD + 1);
  const projected = [];

  for (let index = 0; index <= 59 + horizonDays; index += 1) {
    const date = new Date(firstDate.getTime() + (index * DAY_MS));
    const isHistorical = date <= current.date;
    const historical = isHistorical
      ? series.find((row) => toDateKey(row.date) === toDateKey(date))
      : null;
    const paymentNumber = Math.floor((date.getTime() - firstPaymentDate.getTime()) / (paymentIntervalDays * DAY_MS));
    const isDistributionWindow = date >= firstPaymentDate && paymentNumber >= 0;
    // Each completed 30-day accrual batch is spread uniformly across the
    // following 30 days: batch / 30 = dailyYield. This removes artificial
    // monthly spikes while preserving the same total annualized flow.
    const modeledBuyback = !isHistorical && isDistributionWindow ? dailyYield : 0;
    // Keep the observed Hyperliquid revenue stream as-is. Beyond the
    // observed history, hold its latest 30d-EMA level as the baseline and
    // add the AQAv2 daily distribution on top. Replacing the baseline with
    // the smaller AQAv2-only amount made revenue (and therefore SWPE) move
    // in the wrong direction after the first payment.
    const revenue = historical?.buybackRevenue ?? (current.revenueEma30 + modeledBuyback);

    if (Number.isFinite(revenue) && revenue > 0) {
      ema = (revenue * alpha) + (ema * (1 - alpha));
    }

    const price = historical?.price ?? current.price;
    const circulatingSupply = historical?.circulatingSupply ?? current.circulatingSupply;
    const stakedHype = historical?.stakedHype ?? current.stakedHype;
    const readySupply = Math.max(circulatingSupply - stakedHype, 0);
    const selectedSupply = selectSupply(config.supplyMode, { circulatingSupply, readySupply });
    const selectedMarketCap = selectedSupply * price;
    const annualizedRevenue = ema * 365;

    projected.push({
      date,
      price,
      circulatingSupply,
      stakedHype,
      readySupply,
      selectedSupply,
      selectedMarketCap,
      buybackRevenue: revenue,
      modeledBuybackRevenue: modeledBuyback,
      revenueEma30: ema,
      annualizedRevenue,
      swpe: annualizedRevenue > 0 ? selectedMarketCap / annualizedRevenue : 0,
      meanSwpe: 0,
      isProjected: !isHistorical,
    });
  }

  const meanSwpe = average(projected.map((row) => row.swpe));
  return projected.map((row) => ({ ...row, meanSwpe }));
}

function getAdjustedScenarioLabel(config) {
  const annualizedYield = config.usdcBalance * config.reserveYieldRate * config.aqaProtocolShare;
  return `AQAv2: ${formatCompactCurrency(annualizedYield)}/yr at ${formatCompactNumber(config.usdcBalance)} USDC, ${formatNumber(config.aqaProtocolShare * 100, 0)}% share`;
}

function selectSupply(mode, supply) {
  if (mode === "circulating") {
    return supply.circulatingSupply;
  }

  return supply.readySupply;
}

function renderDualAxisChart(container, options) {
  const data = options.data.filter((row) =>
    Number.isFinite(row.swpe) &&
    Number.isFinite(row.meanSwpe) &&
    Number.isFinite(row.revenueEma30)
  );
  const width = container.clientWidth || 1000;
  const height = container.clientHeight || 360;
  const padding = { top: 56, right: 72, bottom: 42, left: 72 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const tickCount = 5;

  const swpeValues = data.flatMap((row) => [row.swpe, options.meanValue]);
  const revenueValues = data.map((row) => row.revenueEma30);
  const swpeMin = Math.max(0, Math.min(...swpeValues) - ((Math.max(...swpeValues) - Math.min(...swpeValues) || 1) * 0.08));
  const swpeMax = Math.max(...swpeValues) + ((Math.max(...swpeValues) - Math.min(...swpeValues) || 1) * 0.12);
  const revenueMin = Math.max(0, Math.min(...revenueValues) - ((Math.max(...revenueValues) - Math.min(...revenueValues) || 1) * 0.08));
  const revenueMax = Math.max(...revenueValues) + ((Math.max(...revenueValues) - Math.min(...revenueValues) || 1) * 0.12);

  const xPoints = data.map((row, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
    return { x, row };
  });

  const toLeftY = (value) => padding.top + ((swpeMax - value) / Math.max(swpeMax - swpeMin, 1)) * innerHeight;
  const toRightY = (value) => padding.top + ((revenueMax - value) / Math.max(revenueMax - revenueMin, 1)) * innerHeight;

  const buildPolylinePoints = (key, yScale) => xPoints
    .map((point) => `${point.x.toFixed(2)},${yScale(point.row[key]).toFixed(2)}`)
    .join(" ");

  const swpePolyline = buildPolylinePoints("swpe", toLeftY);
  const revenuePolyline = buildPolylinePoints("revenueEma30", toRightY);
  const meanLineY = toLeftY(options.meanValue ?? 0);

  const leftTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const value = swpeMax - ((swpeMax - swpeMin) * ratio);
    const y = padding.top + innerHeight * ratio;
    return { value, y };
  });

  const rightTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const value = revenueMax - ((revenueMax - revenueMin) * ratio);
    const y = padding.top + innerHeight * ratio;
    return { value, y };
  });

  const xLabels = (options.xLabelIndices || []).map((pointIndex) => {
    const row = data[pointIndex];
    const x = padding.left + (pointIndex / Math.max(data.length - 1, 1)) * innerWidth;
    return {
      x,
      label: formatDateLabel(row.date),
    };
  });

  container.innerHTML = `
    <div class="chart-legend">
      <span class="legend-pill"><span class="legend-line" style="background:#b44380"></span>${options.adjusted ? "Adjusted SWPE ratio" : "SWPE ratio"}</span>
      <span class="legend-pill"><span class="legend-line dashed" style="color:#b48a2a"></span>Mean SWPE</span>
      <span class="legend-pill"><span class="legend-line" style="background:#1d79b4"></span>${options.adjusted ? "Adjusted revenue - 30d EMA" : "Revenue - 30d EMA"}</span>
    </div>
    <div class="chart-badge">
      <span>${escapeHtml(options.scenarioLabel || `SWPE ${formatNumber(options.swpeValue, 2)} | mean ${formatNumber(options.meanValue, 2)} | revenue ${formatCompactCurrency(options.revenueValue)}`)}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="SWPE and revenue chart">
      ${leftTicks.map((tick) => `
        <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" stroke="rgba(31,91,136,0.12)" stroke-dasharray="4 8" />
        <text x="${padding.left - 12}" y="${tick.y + 4}" text-anchor="end" class="tick-label">${escapeHtml(formatNumber(tick.value, 2))}</text>
      `).join("")}

      ${rightTicks.map((tick) => `
        <text x="${width - padding.right + 12}" y="${tick.y + 4}" text-anchor="start" class="tick-label">${escapeHtml(formatCompactCurrency(tick.value))}</text>
      `).join("")}

      ${xLabels.map((tick) => `
        <text x="${tick.x}" y="${height - 16}" text-anchor="middle" class="tick-label">${tick.label}</text>
      `).join("")}

      <polyline class="series-line" points="${swpePolyline}" stroke="#b44380" stroke-width="2.1"></polyline>
      <line x1="${padding.left}" y1="${meanLineY}" x2="${width - padding.right}" y2="${meanLineY}" stroke="#b48a2a" stroke-width="2.2" stroke-dasharray="10 9"></line>
      <polyline class="series-line" points="${revenuePolyline}" stroke="#1d79b4" stroke-width="2.1"></polyline>

      ${xPoints.map((point) => `
        <circle cx="${point.x}" cy="${toLeftY(point.row.swpe)}" r="1.15" fill="#b44380" opacity="0.86"></circle>
        <circle cx="${point.x}" cy="${toRightY(point.row.revenueEma30)}" r="1.15" fill="#1d79b4" opacity="0.86"></circle>
      `).join("")}

      <line id="hoverXGuide" class="hover-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" visibility="hidden"></line>
      <circle id="hoverSwpeDot" class="hover-dot" cx="${padding.left}" cy="${padding.top}" r="4.5" fill="#b44380" visibility="hidden"></circle>
      <circle id="hoverRevenueDot" class="hover-dot" cx="${padding.left}" cy="${padding.top}" r="4.5" fill="#1d79b4" visibility="hidden"></circle>

      <circle cx="${xPoints.at(-1)?.x ?? 0}" cy="${toLeftY(xPoints.at(-1)?.row.swpe ?? 0)}" r="5" fill="#b44380" stroke="#fffaf4" stroke-width="3"></circle>
      <circle cx="${xPoints.at(-1)?.x ?? 0}" cy="${toRightY(xPoints.at(-1)?.row.revenueEma30 ?? 0)}" r="5" fill="#1d79b4" stroke="#fffaf4" stroke-width="3"></circle>
      <rect id="hoverOverlay" x="${padding.left}" y="${padding.top}" width="${innerWidth}" height="${innerHeight}" fill="transparent"></rect>
    </svg>
    <div id="chartTooltip" class="chart-tooltip">
      <div class="tooltip-date"></div>
      <div class="tooltip-row"><span>SWPE</span><strong id="tooltipSwpe">-</strong></div>
      <div class="tooltip-row"><span>Mean</span><strong id="tooltipMean">-</strong></div>
      <div class="tooltip-row"><span>Revenue</span><strong id="tooltipRevenue">-</strong></div>
    </div>
  `;

  hoverSyncState[options.syncKey || "combined"] = attachChartTooltip(container, {
    xPoints,
    data,
    padding,
    innerWidth,
    toLeftY,
    toRightY,
    meanValue: options.meanValue,
    syncKey: options.syncKey || "combined",
  });
}

function renderPriceChart(container, options) {
  const data = options.data.filter((row) => Number.isFinite(row.price));
  const width = container.clientWidth || 1000;
  const height = container.clientHeight || 320;
  const padding = { top: 56, right: 72, bottom: 42, left: 72 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const tickCount = 5;

  if (!data.length) {
    container.innerHTML = "";
    return;
  }

  const priceValues = data.map((row) => row.price);
  const priceMin = Math.max(0, Math.min(...priceValues) - ((Math.max(...priceValues) - Math.min(...priceValues) || 1) * 0.08));
  const priceMax = Math.max(...priceValues) + ((Math.max(...priceValues) - Math.min(...priceValues) || 1) * 0.12);

  const xPoints = data.map((row, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
    return { x, row };
  });

  const toY = (value) => padding.top + ((priceMax - value) / Math.max(priceMax - priceMin, 1)) * innerHeight;
  const pricePolyline = xPoints
    .map((point) => `${point.x.toFixed(2)},${toY(point.row.price).toFixed(2)}`)
    .join(" ");

  const leftTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const value = priceMax - ((priceMax - priceMin) * ratio);
    const y = padding.top + innerHeight * ratio;
    return { value, y };
  });

  const xLabels = (options.xLabelIndices || []).map((pointIndex) => {
    const row = data[pointIndex];
    const x = padding.left + (pointIndex / Math.max(data.length - 1, 1)) * innerWidth;
    return {
      x,
      label: formatDateLabel(row.date),
    };
  });

  container.innerHTML = `
    <div class="chart-legend">
      <span class="legend-pill"><span class="legend-line" style="background:#2c7f78"></span>HYPE price</span>
    </div>
    <div class="chart-badge">
      <span>Price ${formatCurrency(options.priceValue)}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="HYPE price chart">
      ${leftTicks.map((tick) => `
        <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" stroke="rgba(31,91,136,0.12)" stroke-dasharray="4 8" />
        <text x="${padding.left - 12}" y="${tick.y + 4}" text-anchor="end" class="tick-label">${escapeHtml(formatCurrency(tick.value))}</text>
      `).join("")}

      ${xLabels.map((tick) => `
        <text x="${tick.x}" y="${height - 16}" text-anchor="middle" class="tick-label">${tick.label}</text>
      `).join("")}

      <polyline class="series-line" points="${pricePolyline}" stroke="#2c7f78" stroke-width="2.1"></polyline>

      ${xPoints.map((point) => `
        <circle cx="${point.x}" cy="${toY(point.row.price)}" r="1.15" fill="#2c7f78" opacity="0.86"></circle>
      `).join("")}

      <line id="priceHoverXGuide" class="hover-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" visibility="hidden"></line>
      <circle id="priceHoverDot" class="hover-dot" cx="${padding.left}" cy="${padding.top}" r="4.5" fill="#2c7f78" visibility="hidden"></circle>

      <circle cx="${xPoints.at(-1)?.x ?? 0}" cy="${toY(xPoints.at(-1)?.row.price ?? 0)}" r="5" fill="#2c7f78" stroke="#fffaf4" stroke-width="3"></circle>
      <rect id="priceHoverOverlay" x="${padding.left}" y="${padding.top}" width="${innerWidth}" height="${innerHeight}" fill="transparent"></rect>
    </svg>
    <div id="priceChartTooltip" class="chart-tooltip">
      <div class="tooltip-date"></div>
      <div class="tooltip-row"><span>Price</span><strong id="tooltipPrice">-</strong></div>
    </div>
  `;

  hoverSyncState.price = attachPriceChartTooltip(container, {
    data,
    xPoints,
    toY,
    syncKey: "price",
  });
}

function buildDemoRows() {
  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startDate = new Date(endDate.getTime() - (364 * DAY_MS));
  const start = startDate.getTime();
  const end = endDate.getTime();
  const rows = [];
  let revenueState = 1650000;
  let priceState = 24.5;

  for (let time = start, index = 0; time <= end; time += DAY_MS, index += 1) {
    const phase = index / 11.5;
    const shock = (hashNoise(index, 1) - 0.5) * 3.8;
    const shockSecondary = (hashNoise(index, 2) - 0.5) * 1.9;
    const revenueShock = (hashNoise(index, 3) - 0.5) * 620000;
    const eventSpike = hashNoise(index, 7) > 0.82 ? (hashNoise(index, 8) - 0.35) * 1750000 : 0;
    const revenueDrop = hashNoise(index, 11) > 0.88 ? -1 * (hashNoise(index, 12) * 900000) : 0;
    const drawdown = hashNoise(index, 9) > 0.89 ? -1 * (hashNoise(index, 10) * 3.7) : 0;

    priceState = Math.max(
      12,
      priceState
        + 0.055
        + (Math.sin(phase * 0.74) * 0.42)
        + shock
        + shockSecondary
        + drawdown
    );

    revenueState = Math.max(
      420000,
      revenueState
        + 7200
        + (Math.sin(phase * 0.53 + 0.9) * 88000)
        + revenueShock
        + eventSpike
        + revenueDrop
    );

    const price = priceState;
    const revenue = revenueState;
    const circulating = 191000000 + (index * 165000) + Math.round((hashNoise(index, 4) - 0.5) * 240000);
    const stakedBase = (circulating * 0.63) + ((hashNoise(index, 5) - 0.5) * 9500000);
    const staked = stakedBase + (Math.sin(phase * 0.31) * 2200000);

    rows.push({
      date: new Date(time),
      price: round(price, 4),
      revenue: Math.max(320000, round(revenue, 2)),
      circulating_supply_native: round(circulating, 0),
      staked_hype: Math.max(0, round(staked, 0)),
      buyback_fee_allocation: Math.max(0, round(revenue * 0.99, 2)),
    });
  }

  return rows;
}

function createLiveSnapshot() {
  return {
    revenueAsOf: null,
    totalStaked: null,
    excludedWalletStaked: null,
    excludedWalletBreakdown: [],
    effectiveCirculatingStaked: null,
    unstakingQueue: null,
    aqaEligibleBalance: null,
    aqaBalanceBreakdown: [],
    aqaBalanceAsOf: null,
  };
}

function parseCsv(text) {
  const rows = [];
  let value = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (insideQuotes && next === "\"") {
        value += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header) => slugifyHeader(header));

  return dataRows.map((dataRow) => {
    const result = {};
    headers.forEach((header, index) => {
      result[header] = dataRow[index] ?? "";
    });
    return result;
  });
}

function normalizeRow(row) {
  const dateValue = row.date || row.block_date || row.day || row.timestamp;
  const date = parseDate(dateValue);
  if (!date) {
    return null;
  }

  return {
    date,
    price: parseMaybeNumber(row.price),
    buybacks: parseMaybeNumber(row.buybacks),
    revenue: parseMaybeNumber(row.revenue),
    fees: parseMaybeNumber(row.fees),
    buyback_fee_allocation: parseMaybeNumber(row.buyback_fee_allocation),
    circulating_supply_native: parseMaybeNumber(row.circulating_supply_native || row.circulating_supply),
    staked_hype: parseMaybeNumber(row.staked_hype || row.staked_tokens || row.staked_supply),
  };
}

function parseMaybeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const cleaned = String(value).replace(/[$,%\s]/g, "").replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const slashMatch = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) {
    return null;
  }

  const [, month, day, year] = slashMatch;
  const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function loadLocalHistoryIfAvailable() {
  try {
    const response = await fetch(`./data/hype-history.csv?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return false;
    }

    const text = await response.text();
    const parsed = parseCsv(text)
      .map(normalizeRow)
      .filter(Boolean);

    if (parsed.length) {
      rawRows = parsed;
      sourceLabel = "Local history file: data/hype-history.csv";
      return true;
    }
  } catch (_error) {
    // Local history file is optional.
  }

  return false;
}

async function loadFreeData({ replaceSeries, silent }) {
  const results = await Promise.allSettled([
    fetchDefiLlamaRevenueSeries(),
    fetchCoinGeckoJson(COINGECKO_COIN_PATH, elements.coingeckoApiKey.value.trim()),
    fetchCoinGeckoJson(COINGECKO_MARKET_CHART_PATH, elements.coingeckoApiKey.value.trim()),
    fetchHyperliquidTotalStaked(),
    fetchHypurrscanUnstakingQueue(),
    fetchExcludedWalletStakes(),
    fetchAqaEligibleBalance(),
  ]);

  const [revenueResult, marketResult, chartResult, stakedResult, unstakingResult, excludedWalletsResult, aqaBalanceResult] = results;

  if (marketResult.status === "fulfilled") {
    applyCoinGeckoMarketSnapshot(marketResult.value);
  } else if (!silent) {
    window.alert(`CoinGecko market refresh failed: ${marketResult.reason?.message || "Unknown error"}`);
  }

  if (chartResult.status === "fulfilled") {
    applyHistoricalMarketChart(chartResult.value);
  }

  if (stakedResult.status === "fulfilled") {
    liveSnapshot.totalStaked = stakedResult.value;
  }

  if (unstakingResult.status === "fulfilled") {
    liveSnapshot.unstakingQueue = unstakingResult.value;
  }

  if (excludedWalletsResult.status === "fulfilled") {
    liveSnapshot.excludedWalletBreakdown = excludedWalletsResult.value;
    liveSnapshot.excludedWalletStaked = excludedWalletsResult.value.reduce((sum, item) => sum + item.delegated, 0);
  }

  if (aqaBalanceResult.status === "fulfilled" && Number.isFinite(aqaBalanceResult.value.total)) {
    liveSnapshot.aqaEligibleBalance = aqaBalanceResult.value.total;
    liveSnapshot.aqaBalanceBreakdown = aqaBalanceResult.value.addresses || [];
    liveSnapshot.aqaBalanceAsOf = new Date();
    elements.usdcBalance.value = Math.round(aqaBalanceResult.value.total);
  }

  updateLiveStakingAdjustment();

  if (replaceSeries && revenueResult.status === "fulfilled") {
    rawRows = buildRowsFromRevenueSeries(revenueResult.value);
    sourceLabel = `DefiLlama daily holders revenue + CoinGecko prices (${formatDateLong(revenueResult.value.at(-1)?.date || new Date())} last completed revenue point)`;
  } else if (replaceSeries && !silent && revenueResult.status === "rejected") {
    window.alert(`DefiLlama revenue refresh failed: ${revenueResult.reason?.message || "Unknown error"}`);
  }

  if (
    marketResult.status === "fulfilled" ||
    stakedResult.status === "fulfilled" ||
    unstakingResult.status === "fulfilled" ||
    aqaBalanceResult.status === "fulfilled"
  ) {
    const snapshotParts = ["Live free-source snapshot"];
    if (marketResult.status === "fulfilled") {
      snapshotParts.push(formatDateLong(new Date()));
    }
    if (Number.isFinite(liveSnapshot.totalStaked)) {
      snapshotParts.push(`${formatCompactNumber(liveSnapshot.totalStaked)} total staked`);
    }
    if (Number.isFinite(liveSnapshot.unstakingQueue)) {
      snapshotParts.push(`${formatCompactNumber(liveSnapshot.unstakingQueue)} unstaking queue`);
    }
    if (Number.isFinite(liveSnapshot.excludedWalletStaked)) {
      snapshotParts.push(`${formatCompactNumber(liveSnapshot.excludedWalletStaked)} excluded-wallet staked`);
    }
    if (Number.isFinite(liveSnapshot.aqaEligibleBalance)) {
      snapshotParts.push(`${formatCompactNumber(liveSnapshot.aqaEligibleBalance)} AQAv2 USDC proxy`);
    }
    marketSnapshotLabel = snapshotParts.join(" | ");
  }

  return results.some((result) => result.status === "fulfilled");
}

async function loadHistoricalPricesIfNeeded() {
  const needsMarketChart = rawRows.some((row) =>
    !Number.isFinite(row.price) || !Number.isFinite(row.circulating_supply_native)
  );

  if (!needsMarketChart) {
    historicalPriceMap = new Map();
    historicalCirculatingMap = new Map();
    return;
  }

  try {
    const payload = await fetchCoinGeckoJson(COINGECKO_MARKET_CHART_PATH, elements.coingeckoApiKey.value.trim());
    applyHistoricalMarketChart(payload);
  } catch (_error) {
    historicalPriceMap = new Map();
    historicalCirculatingMap = new Map();
  }
}

async function refreshMarketFromCoinGecko({ silent }) {
  try {
    const payload = await fetchCoinGeckoJson(COINGECKO_COIN_PATH, elements.coingeckoApiKey.value.trim());
    applyCoinGeckoMarketSnapshot(payload);
    await loadHistoricalPricesIfNeeded();
    persistSettings();
    renderDashboard();
  } catch (error) {
    if (!silent) {
      window.alert(`CoinGecko refresh failed: ${error.message}`);
    }
  }
}

async function fetchCoinGeckoJson(path, apiKey) {
  try {
    const proxyUrl = new URL(COINGECKO_PROXY_URL, window.location.origin);
    proxyUrl.searchParams.set("path", path);
    proxyUrl.searchParams.set("ts", String(Date.now()));
    const proxyResponse = await fetch(proxyUrl.toString(), { cache: "no-store" });
    if (proxyResponse.ok) {
      return await proxyResponse.json();
    }
  } catch (_error) {
    // Ignore proxy failures and try direct mode below.
  }

  const root = COINGECKO_DEMO_URL.replace("/coins/hyperliquid", "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const attempts = [
    {},
    ...(apiKey ? [{ "x-cg-demo-api-key": apiKey }] : []),
  ];

  for (const headers of attempts) {
    const response = await fetch(`${root}${normalizedPath}`, {
      headers,
      cache: "no-store",
    });

    if (response.ok) {
      return await response.json();
    }
  }

  throw new Error("No CoinGecko source available. Use the public endpoint, add a Demo API key, or deploy on Vercel with COINGECKO_DEMO_API_KEY.");
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000000 ? 2 : 0,
    notation: value >= 1000000 ? "compact" : "standard",
  }).format(value);
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatHoverDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function filterSeriesByRange(series, rangeKey) {
  const days = RANGE_DAYS[rangeKey];
  if (!days || series.length <= 1) {
    return series;
  }

  const lastDate = series.at(-1)?.date?.getTime();
  if (!lastDate) {
    return series;
  }

  const threshold = lastDate - ((days - 1) * DAY_MS);
  const filtered = series.filter((row) => row.date.getTime() >= threshold);
  return filtered.length ? filtered : series;
}

function syncTimeframeButtons() {
  elements.timeframeRow.querySelectorAll("[data-range]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.range === selectedRange);
  });
}

function attachChartTooltip(container, context) {
  const overlay = container.querySelector("#hoverOverlay");
  const xGuide = container.querySelector("#hoverXGuide");
  const swpeDot = container.querySelector("#hoverSwpeDot");
  const revenueDot = container.querySelector("#hoverRevenueDot");
  const tooltip = container.querySelector("#chartTooltip");
  const tooltipDate = tooltip?.querySelector(".tooltip-date");
  const tooltipSwpe = container.querySelector("#tooltipSwpe");
  const tooltipMean = container.querySelector("#tooltipMean");
  const tooltipRevenue = container.querySelector("#tooltipRevenue");

  if (!overlay || !tooltip || !tooltipDate || !tooltipSwpe || !tooltipMean || !tooltipRevenue) {
    return null;
  }

  const hide = (sync = true) => {
    tooltip.classList.remove("is-visible");
    xGuide?.setAttribute("visibility", "hidden");
    swpeDot?.setAttribute("visibility", "hidden");
    revenueDot?.setAttribute("visibility", "hidden");
    if (sync) {
      syncHoverHide(context.syncKey);
    }
  };

  const showAtIndex = (index, sync = true) => {
    const point = context.xPoints[index];
    if (!point) {
      hide(sync);
      return;
    }

    const x = point.x;
    const swpeY = context.toLeftY(point.row.swpe);
    const revenueY = context.toRightY(point.row.revenueEma30);

    xGuide?.setAttribute("x1", String(x));
    xGuide?.setAttribute("x2", String(x));
    xGuide?.setAttribute("visibility", "visible");

    swpeDot?.setAttribute("cx", String(x));
    swpeDot?.setAttribute("cy", String(swpeY));
    swpeDot?.setAttribute("visibility", "visible");

    revenueDot?.setAttribute("cx", String(x));
    revenueDot?.setAttribute("cy", String(revenueY));
    revenueDot?.setAttribute("visibility", "visible");

    tooltipDate.textContent = formatHoverDate(point.row.date);
    tooltipSwpe.textContent = formatNumber(point.row.swpe, 2);
    tooltipMean.textContent = formatNumber(context.meanValue, 2);
    tooltipRevenue.textContent = formatCompactCurrency(point.row.revenueEma30);

    tooltip.classList.add("is-visible");
    positionTooltip(container, tooltip, x, Math.min(swpeY, revenueY) - 6);
    if (sync) {
      syncHoverByDate(context.syncKey, point.row.date);
    }
  };

  overlay.addEventListener("mousemove", (event) => {
    const rect = overlay.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, localX / rect.width));
    const index = Math.round(ratio * Math.max(context.data.length - 1, 0));
    showAtIndex(index);
  });

  overlay.addEventListener("mouseleave", hide);
  overlay.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const rect = overlay.getBoundingClientRect();
    const localX = touch.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, localX / rect.width));
    const index = Math.round(ratio * Math.max(context.data.length - 1, 0));
    showAtIndex(index);
  }, { passive: true });
  overlay.addEventListener("touchend", hide);

  return {
    showAtIndex(index) {
      if (index >= 0 && index < context.xPoints.length) {
        showAtIndex(index, false);
      } else {
        hide(false);
      }
    },
    showAtDate(date) {
      const index = findClosestDateIndex(context.xPoints, date);
      if (index >= 0) {
        showAtIndex(index, false);
      } else {
        hide(false);
      }
    },
    hide() {
      hide(false);
    },
  };
}

function attachPriceChartTooltip(container, context) {
  const overlay = container.querySelector("#priceHoverOverlay");
  const xGuide = container.querySelector("#priceHoverXGuide");
  const priceDot = container.querySelector("#priceHoverDot");
  const tooltip = container.querySelector("#priceChartTooltip");
  const tooltipDate = tooltip?.querySelector(".tooltip-date");
  const tooltipPrice = container.querySelector("#tooltipPrice");

  if (!overlay || !tooltip || !tooltipDate || !tooltipPrice) {
    return null;
  }

  const hide = (sync = true) => {
    tooltip.classList.remove("is-visible");
    xGuide?.setAttribute("visibility", "hidden");
    priceDot?.setAttribute("visibility", "hidden");
    if (sync) {
      syncHoverHide(context.syncKey);
    }
  };

  const showAtIndex = (index, sync = true) => {
    const point = context.xPoints[index];
    if (!point) {
      hide(sync);
      return;
    }

    const x = point.x;
    const y = context.toY(point.row.price);

    xGuide?.setAttribute("x1", String(x));
    xGuide?.setAttribute("x2", String(x));
    xGuide?.setAttribute("visibility", "visible");

    priceDot?.setAttribute("cx", String(x));
    priceDot?.setAttribute("cy", String(y));
    priceDot?.setAttribute("visibility", "visible");

    tooltipDate.textContent = formatHoverDate(point.row.date);
    tooltipPrice.textContent = formatCurrency(point.row.price);

    tooltip.classList.add("is-visible");
    positionTooltip(container, tooltip, x, y - 6);
    if (sync) {
      syncHoverByDate(context.syncKey, point.row.date);
    }
  };

  overlay.addEventListener("mousemove", (event) => {
    const rect = overlay.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, localX / rect.width));
    const index = Math.round(ratio * Math.max(context.data.length - 1, 0));
    showAtIndex(index);
  });

  overlay.addEventListener("mouseleave", hide);
  overlay.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const rect = overlay.getBoundingClientRect();
    const localX = touch.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, localX / rect.width));
    const index = Math.round(ratio * Math.max(context.data.length - 1, 0));
    showAtIndex(index);
  }, { passive: true });
  overlay.addEventListener("touchend", hide);

  return {
    showAtIndex(index) {
      if (index >= 0 && index < context.xPoints.length) {
        showAtIndex(index, false);
      } else {
        hide(false);
      }
    },
    showAtDate(date) {
      const index = findClosestDateIndex(context.xPoints, date);
      if (index >= 0) {
        showAtIndex(index, false);
      } else {
        hide(false);
      }
    },
    hide() {
      hide(false);
    },
  };
}

function findClosestDateIndex(xPoints, date) {
  if (!xPoints?.length || !date) {
    return -1;
  }

  const target = date.getTime();
  let bestIndex = 0;
  let bestDistance = Math.abs(xPoints[0].row.date.getTime() - target);
  for (let index = 1; index < xPoints.length; index += 1) {
    const distance = Math.abs(xPoints[index].row.date.getTime() - target);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }
  return bestDistance <= DAY_MS / 2 ? bestIndex : -1;
}

function syncHoverByDate(source, date) {
  if (hoverSyncState.isSyncing) {
    return;
  }

  hoverSyncState.isSyncing = true;
  try {
    Object.entries(hoverSyncState).forEach(([key, tooltip]) => {
      if (key !== source && key !== "isSyncing") {
        tooltip?.showAtDate(date);
      }
    });
  } finally {
    hoverSyncState.isSyncing = false;
  }
}

function syncHoverHide(source) {
  if (hoverSyncState.isSyncing) {
    return;
  }

  hoverSyncState.isSyncing = true;
  try {
    Object.entries(hoverSyncState).forEach(([key, tooltip]) => {
      if (key !== source && key !== "isSyncing") {
        tooltip?.hide();
      }
    });
  } finally {
    hoverSyncState.isSyncing = false;
  }
}

function positionTooltip(container, tooltip, desiredLeft, desiredTop) {
  const tooltipWidth = tooltip.offsetWidth || 188;
  const tooltipHeight = tooltip.offsetHeight || 96;
  const halfWidth = tooltipWidth / 2;
  const clampedLeft = Math.max(halfWidth + 12, Math.min(container.clientWidth - halfWidth - 12, desiredLeft));
  const clampedTop = Math.max(tooltipHeight + 20, Math.min(container.clientHeight - 12, desiredTop));

  tooltip.style.left = `${clampedLeft}px`;
  tooltip.style.top = `${clampedTop}px`;
}

function formatSupplyMode(mode) {
  if (mode === "circulating") {
    return "Circulating";
  }
  return "Ready-for-Sale";
}

function getSupplyModeDescription(mode, current) {
  if (mode === "circulating") {
    return `${formatCompactNumber(current.circulatingSupply)} HYPE x ${formatCurrency(current.price)}`;
  }

  return `${formatCompactNumber(current.readySupply)} HYPE after subtracting ${formatCompactNumber(current.stakedHype)} net circulating staked`;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function slugifyHeader(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function round(value, digits) {
  return Number(value.toFixed(digits));
}

function hashNoise(index, seed) {
  const raw = Math.sin((index + 1) * (seed * 12.9898 + 78.233)) * 43758.5453;
  return raw - Math.floor(raw);
}

function debounce(callback, waitMs) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, waitMs);
  };
}

function persistSettings() {
  const payload = {
    supplyMode: elements.supplyMode.value,
    currentPrice: elements.currentPrice.value,
    circulatingSupply: elements.circulatingSupply.value,
    totalSupply: elements.totalSupply.value,
    defaultStakedPct: elements.defaultStakedPct.value,
    buybackShare: elements.buybackShare.value,
    coingeckoApiKey: elements.coingeckoApiKey.value,
    autoRefreshMode: elements.autoRefreshMode.value,
    aqaActivationDate: elements.aqaActivationDate.value,
    usdcBalance: elements.usdcBalance.value,
    reserveYieldRate: elements.reserveYieldRate.value,
    aqaProtocolShare: elements.aqaProtocolShare.value,
    buybackPaymentLag: elements.buybackPaymentLag.value,
  };

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

function readSavedSettings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
  } catch (_error) {
    return {};
  }
}

function getHistoricalPriceForDate(date) {
  return historicalPriceMap.get(toDateKey(date)) ?? null;
}

function getHistoricalCirculatingForDate(date) {
  return historicalCirculatingMap.get(toDateKey(date)) ?? null;
}

function toDateKey(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function resolveStakedHype({ row, config, circulatingSupply, isLast }) {
  if (Number.isFinite(row.staked_hype)) {
    return row.staked_hype;
  }

  if (isLast && Number.isFinite(liveSnapshot.effectiveCirculatingStaked)) {
    return liveSnapshot.effectiveCirculatingStaked;
  }

  return circulatingSupply * config.defaultStakedPct;
}

async function fetchDefiLlamaRevenueSeries() {
  const payload = await fetchProxyFirstJson({
    proxyPath: `${DEFILLAMA_PROXY_URL}?path=${encodeURIComponent("/summary/fees/hyperliquid?dataType=dailyHoldersRevenue")}`,
    fallbackUrl: DEFILLAMA_HOLDERS_REVENUE_URL,
  });
  const points = Array.isArray(payload.totalDataChart) ? payload.totalDataChart : [];
  return points
    .map(([timestamp, revenue]) => ({
      date: new Date(Number(timestamp) * 1000),
      revenue: Number(revenue),
    }))
    .filter((row) => !Number.isNaN(row.date.getTime()) && Number.isFinite(row.revenue));
}

async function fetchHyperliquidTotalStaked() {
  const payload = await fetchHyperliquidInfo({
    type: "validatorSummaries",
  });

  return payload.reduce((sum, item) => sum + (Number(item.stake) / 1e8), 0);
}

async function fetchHypurrscanUnstakingQueue() {
  const payload = await fetchProxyFirstJson({
    proxyPath: `${HYPURRSCAN_PROXY_URL}?path=${encodeURIComponent("/unstakingQueue")}`,
    fallbackUrl: HYPURRSCAN_UNSTAKING_URL,
  });
  return payload.reduce((sum, item) => sum + (Number(item.wei) / 1e8), 0);
}

async function fetchAqaEligibleBalance() {
  const payload = await fetchJson(`${AQAV2_BALANCE_PROXY_URL}?token=${encodeURIComponent(AQAV2_USDC_TOKEN)}&addresses=${encodeURIComponent(AQAV2_TREASURY_ADDRESSES.join(","))}`);
  if (!Number.isFinite(Number(payload.total))) {
    throw new Error("AQAv2 balance proxy returned no total");
  }
  return {
    total: Number(payload.total),
    addresses: Array.isArray(payload.addresses) ? payload.addresses : [],
  };
}

async function fetchExcludedWalletStakes() {
  const summaries = await Promise.all(
    EXCLUDED_STAKING_WALLETS.map(async (wallet) => {
      const summary = await fetchHyperliquidDelegatorSummary(wallet.address);
      return {
        ...wallet,
        delegated: Number(summary.delegated || 0),
        undelegated: Number(summary.undelegated || 0),
        totalPendingWithdrawal: Number(summary.totalPendingWithdrawal || 0),
      };
    })
  );

  return summaries;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return await response.json();
}

async function fetchHyperliquidDelegatorSummary(address) {
  return await fetchHyperliquidInfo({
    type: "delegatorSummary",
    user: address,
  });
}

async function fetchHyperliquidInfo(payload) {
  const proxyResponse = await tryFetchJson(HYPERLIQUID_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (proxyResponse.ok) {
    return proxyResponse.data;
  }

  return await fetchJson(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function fetchProxyFirstJson({ proxyPath, fallbackUrl, options = {} }) {
  const proxyResponse = await tryFetchJson(proxyPath, options);
  if (proxyResponse.ok) {
    return proxyResponse.data;
  }

  return await fetchJson(fallbackUrl, options);
}

async function tryFetchJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      ...options,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: await response.json(),
    };
  } catch (_error) {
    return {
      ok: false,
      status: 0,
      data: null,
    };
  }
}

function applyCoinGeckoMarketSnapshot(payload) {
  const marketData = payload.market_data || {};
  const currentPrice = marketData.current_price?.usd;
  const circulatingSupply = marketData.circulating_supply;
  const totalSupply = marketData.total_supply;

  if (Number.isFinite(currentPrice)) {
    elements.currentPrice.value = Number(currentPrice).toFixed(2);
  }

  if (Number.isFinite(circulatingSupply)) {
    elements.circulatingSupply.value = Math.round(circulatingSupply);
  }

  if (Number.isFinite(totalSupply)) {
    elements.totalSupply.value = Math.round(totalSupply);
  }
}

function applyHistoricalMarketChart(payload) {
  const prices = Array.isArray(payload.prices) ? payload.prices : [];
  const marketCaps = Array.isArray(payload.market_caps) ? payload.market_caps : [];

  // CoinGecko's daily market_chart points are timestamped at the start of
  // the UTC day, while DefiLlama labels daily revenue by the completed day.
  // Align each revenue date with the first quote of the following UTC day.
  // This prevents an event-day volume/revenue spike from being paired with
  // the stale price from 00:00 at the start of that same day.
  historicalPriceMap = buildNextUtcDayAlignedMap(prices);

  const alignedMarketCaps = buildNextUtcDayAlignedMap(marketCaps);
  historicalCirculatingMap = new Map(
    [...alignedMarketCaps.entries()]
      .map(([dateKey, marketCap]) => {
        const price = historicalPriceMap.get(dateKey);
        const circulating = Number.isFinite(price) && price > 0
          ? Number(marketCap) / price
          : null;
        return [dateKey, circulating];
      })
      .filter(([, circulating]) => Number.isFinite(circulating))
  );
}

function buildNextUtcDayAlignedMap(points) {
  const firstPointByDate = new Map();
  for (const [timestamp, value] of points) {
    const date = new Date(timestamp);
    const numericValue = Number(value);
    if (Number.isNaN(date.getTime()) || !Number.isFinite(numericValue)) {
      continue;
    }

    const dateKey = toDateKey(date);
    const existing = firstPointByDate.get(dateKey);
    if (!existing || date.getTime() < existing.timestamp) {
      firstPointByDate.set(dateKey, { timestamp: date.getTime(), value: numericValue });
    }
  }

  const aligned = new Map();
  for (const point of firstPointByDate.values()) {
    const completedDate = new Date(point.timestamp - DAY_MS);
    aligned.set(toDateKey(completedDate), point.value);
  }
  return aligned;
}

function updateLiveStakingAdjustment() {
  if (!Number.isFinite(liveSnapshot.totalStaked)) {
    return;
  }

  const netStakedAfterQueue = Math.max(
    liveSnapshot.totalStaked - finiteOr(liveSnapshot.unstakingQueue, 0),
    0
  );
  const excludedWalletStaked = finiteOr(liveSnapshot.excludedWalletStaked, 0);
  const effectiveCirculatingStaked = Math.max(
    netStakedAfterQueue - excludedWalletStaked,
    0
  );

  liveSnapshot.effectiveCirculatingStaked = effectiveCirculatingStaked;

  const circulatingSupply = Number(elements.circulatingSupply.value) || DEFAULTS.circulatingSupply;
  if (circulatingSupply > 0) {
    elements.defaultStakedPct.value = ((effectiveCirculatingStaked / circulatingSupply) * 100).toFixed(1);
  }
}

function buildRowsFromRevenueSeries(series) {
  const rows = series.map((row) => ({
    date: row.date,
    revenue: row.revenue,
  }));
  const today = getUtcMidnight(new Date());
  const lastDateKey = toDateKey(rows.at(-1)?.date || today);
  let appendedCurrentCarryForward = false;

  if (lastDateKey !== toDateKey(today)) {
    rows.push({
      date: today,
    });
    appendedCurrentCarryForward = true;
  }

  liveSnapshot.revenueAsOf = appendedCurrentCarryForward
    ? rows.at(-2)?.date || rows.at(-1)?.date || null
    : rows.at(-1)?.date || null;
  return rows;
}

function getRevenueMeta(current) {
  if (liveSnapshot.revenueAsOf) {
    return `30d EMA of DefiLlama daily holders revenue through ${formatDateLong(liveSnapshot.revenueAsOf)} | annualized ${formatCompactCurrency(current.annualizedRevenue)}`;
  }

  return `Annualized buyback revenue: ${formatCompactCurrency(current.annualizedRevenue)}`;
}

function hasUploadedHistory() {
  return sourceLabel.startsWith("Uploaded") || sourceLabel.startsWith("Local history file");
}

function getUtcMidnight(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
