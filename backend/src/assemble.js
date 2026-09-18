// Combines the raw SAP B1 query results into the row shapes xlsxBuilders.js
// expects. Kept separate from sapB1Queries.js so the "what does B1 return"
// code and the "how do we combine it" code don't get tangled together.
const queries = require("./sapB1Queries");

async function assembleBomTrees(client, { itemGroupCode, treeCodes } = {}) {
  const [itemsMaster, trees] = await Promise.all([
    queries.fetchItemsMaster(client, { itemGroupCode }),
    queries.fetchProductTrees(client, { treeCodes }),
  ]);
  return trees.map((tree) => {
    const self = itemsMaster.get(String(tree.TreeCode));
    return {
      code: tree.TreeCode,
      sheetName: tree.TreeCode,
      description: self ? self.ItemName : "",
      lines: (tree.ProductTreeLines || []).map((line) => {
        const comp = itemsMaster.get(String(line.ItemCode));
        return {
          code: line.ItemCode,
          description: comp ? comp.ItemName : "",
          quantity: line.Quantity,
          uom: comp ? comp.InventoryUOM : "NOS",
          // Falls back to the item's own Last Purchase Price when this line
          // isn't itself a linked sub-assembly — RATE MASTER resolution on
          // the portal side takes over from here.
          unitPrice: comp ? comp.LastPurchasePrice || 0 : 0,
        };
      }),
    };
  });
}

async function assemblePriceListRows(client, { priceListId, lookbackDays, itemCodes } = {}) {
  const [plRows, grpoMap] = await Promise.all([
    queries.fetchPriceListRates(client, { priceListId }),
    queries.fetchGrpoRates(client, { lookbackDays, itemCodes }),
  ]);
  const byCode = new Map(plRows.map((r) => [String(r.itemCode), r]));
  grpoMap.forEach((v, code) => {
    const existing = byCode.get(code) || { itemCode: code, priceListRate: null, priceUpdateDate: null };
    existing.grpoRate = v.rate;
    existing.latestGrpoDate = v.date;
    byCode.set(code, existing);
  });
  return Array.from(byCode.values());
}

module.exports = { assembleBomTrees, assemblePriceListRows };
