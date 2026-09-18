const express = require("express");
const builders = require("../src/xlsxBuilders");
const mock = require("../src/mockData");
const assemble = require("../src/assemble");

function sendXlsx(res, workbook, filename) {
  const buffer = builders.workbookToBuffer(workbook);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

// `getClient` is a () => SapB1Client | null — null in mock mode.
function createDataRoutes({ getClient, config }) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true, mockMode: config.mockMode });
  });

  router.get("/bom-dump.xlsx", async (req, res, next) => {
    try {
      const trees = config.mockMode
        ? mock.bomTrees
        : await assemble.assembleBomTrees(getClient(), {
            itemGroupCode: config.fgItemGroupCode,
            treeCodes: req.query.items ? String(req.query.items).split(",") : undefined,
          });
      sendXlsx(res, builders.buildBomDumpWorkbook(trees), "SAP BOM Dump.xlsx");
    } catch (err) {
      next(err);
    }
  });

  router.get("/price-list.xlsx", async (req, res, next) => {
    try {
      const rows = config.mockMode
        ? mock.priceListRows
        : await assemble.assemblePriceListRows(getClient(), {
            priceListId: config.priceListId,
            lookbackDays: config.grpoLookbackDays,
            itemCodes: req.query.items ? String(req.query.items).split(",") : undefined,
          });
      sendXlsx(res, builders.buildPriceListWorkbook(rows), "Price List.xlsx");
    } catch (err) {
      next(err);
    }
  });

  router.get("/bp-catalogue.xlsx", async (req, res, next) => {
    try {
      const { fetchBpCatalogue } = require("../src/sapB1Queries");
      const rows = config.mockMode ? mock.bpCatalogueRows : await fetchBpCatalogue(getClient());
      sendXlsx(res, builders.buildBpCatalogueWorkbook(rows), "BP Catalogue.xlsx");
    } catch (err) {
      next(err);
    }
  });

  router.get("/fg-price-list.xlsx", async (req, res, next) => {
    try {
      const { fetchFgPriceList } = require("../src/sapB1Queries");
      const rows = config.mockMode
        ? mock.fgPriceListRows
        : await fetchFgPriceList(getClient(), { priceListId: config.fgPriceListId || config.priceListId, fgItemGroupCode: config.fgItemGroupCode });
      sendXlsx(res, builders.buildFgPriceListWorkbook(rows), "FG Price List.xlsx");
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createDataRoutes;
