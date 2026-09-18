// Real SAP B1 Service Layer queries, one function per data source the
// portal needs. Every function is isolated and commented with a
// "CONFIRM WITH YOUR SAP B1 / BASIS TEAM" note wherever the mapping
// depends on how *your* SAP B1 is configured (price list numbers, item
// groups, custom fields) rather than something standard across every B1
// install — tune those without touching anything else in this file.

function toIsoDate(d) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

// Items master: ItemCode / ItemName / InventoryUOM / LastPurchasePrice.
// LastPurchasePrice is SAP B1's built-in "undated Last Purchase Price"
// (OITM.LastPurPrc) — the exact fallback the brief's §3 describes for a
// BOM line with zero qualifying RATE MASTER candidates.
async function fetchItemsMaster(client, { itemGroupCode } = {}) {
  const params = {
    $select: "ItemCode,ItemName,InventoryUOM,LastPurchasePrice,ItemsGroupCode",
  };
  if (itemGroupCode) params.$filter = `ItemsGroupCode eq ${itemGroupCode}`;
  const items = await client.getAllPages("/Items", params);
  const byCode = new Map();
  items.forEach((it) => byCode.set(String(it.ItemCode), it));
  return byCode;
}

// Bill of Materials: SAP B1's native multi-level BOM object. A
// ProductTreeLine's ItemCode can itself be a Template/Production item with
// its own ProductTree — this is exactly the recursive sub-assembly pattern
// the portal's engine (Driver/SPD/LED-board links) already expects.
// CONFIRM: on some B1 versions ProductTreeLines needs an explicit
// $expand=ProductTreeLines — if the lines come back empty, add that.
async function fetchProductTrees(client, { treeCodes } = {}) {
  const params = { $select: "TreeCode,TreeType,ProductTreeLines" };
  if (treeCodes && treeCodes.length) {
    params.$filter = treeCodes.map((c) => `TreeCode eq '${c}'`).join(" or ");
  }
  return client.getAllPages("/ProductTrees", params);
}

// PriceListRate: from each Item's nested ItemPrices collection, filtered to
// your configured Price List number.
// CONFIRM: standard ItemPrices rows don't carry a per-row "last changed"
// timestamp via Service Layer — PriceUpdateDate below is approximated as
// today's date (the fetch date) until your Basis team points at a real
// source (a B1 change-log table, or a custom UDF that tracks it).
async function fetchPriceListRates(client, { priceListId, itemsMaster }) {
  const items = await client.getAllPages("/Items", { $select: "ItemCode,ItemPrices" });
  const today = toIsoDate(new Date());
  const rows = [];
  items.forEach((it) => {
    const prices = it.ItemPrices || [];
    const match = prices.find((p) => String(p.PriceList) === String(priceListId));
    if (match && match.Price != null) {
      rows.push({ itemCode: it.ItemCode, priceListRate: match.Price, priceUpdateDate: today, grpoRate: null, latestGrpoDate: null });
    }
  });
  return rows;
}

// GRPORate / LatestGRPODate: most recent Goods Receipt PO line per item
// within the lookback window.
// CONFIRM: pulling all GRPOs in the window can be a heavy query on a large
// system — for production, consider restricting $filter to the specific
// item codes you're about to cost (pass `itemCodes`) rather than fetching
// every GRPO company-wide.
async function fetchGrpoRates(client, { lookbackDays = 400, itemCodes } = {}) {
  const since = new Date(Date.now() - lookbackDays * 86400000);
  const sinceStr = toIsoDate(since);
  const params = {
    $select: "DocDate,DocumentLines",
    $filter: `DocDate ge '${sinceStr}'`,
    $orderby: "DocDate desc",
  };
  const docs = await client.getAllPages("/PurchaseDeliveryNotes", params);
  const latestByItem = new Map(); // itemCode -> { rate, date }
  const wanted = itemCodes ? new Set(itemCodes.map(String)) : null;
  docs.forEach((doc) => {
    (doc.DocumentLines || []).forEach((line) => {
      const code = String(line.ItemCode);
      if (wanted && !wanted.has(code)) return;
      if (!latestByItem.has(code)) {
        latestByItem.set(code, { rate: line.UnitPrice ?? line.Price, date: toIsoDate(doc.DocDate) });
      }
    });
  });
  return latestByItem;
}

// BP Catalogue / "12NC": SAP B1 has a built-in Alternate Catalog Number
// feature tied to a Business Partner (table OSCN), but in most manufacturing
// B1 setups a "12NC"-style internal code is instead kept as a User-Defined
// Field on the Item master (commonly named something like U_12NC).
// CONFIRM WITH YOUR BASIS TEAM which of the two your system actually uses —
// this defaults to the UDF approach as the more common real-world case;
// swap the $select field name below if yours differs.
async function fetchBpCatalogue(client, { udfFieldName = "U_12NC" } = {}) {
  const items = await client.getAllPages("/Items", {
    $select: `ItemCode,ItemName,ForeignName,${udfFieldName}`,
  });
  return items.map((it) => ({
    itemNo: it.ItemCode,
    bpCatalogNumber: it[udfFieldName] || "",
    bpCatalogDescription: it.ForeignName || it.ItemName || "",
    itemDescription: it.ItemName || "",
  }));
}

// FG Price List / "current PO price": each FG's own price from a
// configured sales/purchase Price List.
// CONFIRM: which Price List number represents "current system FG price" —
// defaults to the same B1_PRICE_LIST_ID used for RATE MASTER unless
// B1_FG_PRICE_LIST_ID is set separately in .env.
async function fetchFgPriceList(client, { priceListId, fgItemGroupCode }) {
  const params = { $select: "ItemCode,ItemPrices,ItemsGroupCode" };
  if (fgItemGroupCode) params.$filter = `ItemsGroupCode eq ${fgItemGroupCode}`;
  const items = await client.getAllPages("/Items", params);
  const rows = [];
  items.forEach((it) => {
    const match = (it.ItemPrices || []).find((p) => String(p.PriceList) === String(priceListId));
    if (match && match.Price != null) rows.push({ itemNo: it.ItemCode, price: match.Price });
  });
  return rows;
}

module.exports = {
  fetchItemsMaster,
  fetchProductTrees,
  fetchPriceListRates,
  fetchGrpoRates,
  fetchBpCatalogue,
  fetchFgPriceList,
};
