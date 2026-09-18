# Costing Portal backend — SAP Business One bridge

Fetches BOM, Price List, BP Catalogue, and FG Price List from SAP Business
One's Service Layer and serves each as an `.xlsx` file **in the exact shape
the portal's `app.js` already parses** — so nothing about the frontend
engine (categorisation, RATE MASTER, recursive sub-assembly resolution)
needed to change. The portal's "Fetch from SAP B1" button calls this server
instead of you uploading files by hand.

Ships in **mock mode by default** — it returns a small, clearly-fake demo
dataset, so you can test the whole pipeline (backend → xlsx → portal →
downloaded workbook) right now, before SAP B1 Service Layer access exists.

## Quick start (mock mode — no SAP B1 needed)

```
cd backend
npm install
npm start
```

Server starts on `http://localhost:4000`. Open the portal (`index.html`),
go to **New Costing Run**, and in the "Fetch from SAP Business One" card
enter `http://localhost:4000` and click the fetch button — it fills all 4
dropzones with the mock data. This proves the plumbing works end-to-end.

Already verified (see conversation history): the generated files parse
correctly through the portal's actual `parseBlocks`/`findAllHeaderRows`
logic, unmodified.

## Going live against real SAP B1

1. **Confirm Service Layer is reachable.** Ask your Basis/IT team for:
   - The Service Layer URL, e.g. `https://sap-server:50000/b1s/v1`
   - The exact CompanyDB name
   - A **dedicated service account** (not a personal login) — read-only
     scoped where SAP B1's authorization model allows it
2. Copy `.env.example` to `.env` and fill in `B1_SERVICE_LAYER_URL`,
   `B1_COMPANY_DB`, `B1_USERNAME`, `B1_PASSWORD`.
3. Set `B1_MOCK_MODE=false`.
4. Fill in the **business-specific mapping** values in `.env` — these are
   assumptions until validated against your actual SAP B1 setup:
   - `B1_PRICE_LIST_ID` — which Price List number is "PriceListRate"
   - `B1_FG_ITEM_GROUP_CODE` — which Item Group identifies finished goods
   - The BP Catalogue / "12NC" field name in `src/sapB1Queries.js`
     (`fetchBpCatalogue`'s `udfFieldName` — defaults to `U_12NC`, change if
     your system uses a different UDF or the built-in Alternate Catalog
     Number feature instead)
5. Restart (`npm start`) and hit `GET /api/health` — it should report
   `"mockMode": false`. Then try `GET /api/bom-dump.xlsx` for one real item
   and inspect the output before running a full costing pass.

Every business-specific assumption is marked with a
`CONFIRM WITH YOUR SAP B1 / BASIS TEAM` comment in `src/sapB1Queries.js` —
that file is the one place you or your SAP partner will need to tune.

## Deploying (cloud + VPN, per your setup)

This server needs **network access to your SAP B1 Service Layer** — since
you're hosting it on cloud (Azure/AWS) rather than on-prem next to SAP B1,
your IT team will need to set up a VPN or private link from the cloud VM/
container to the SAP B1 host, and firewall the Service Layer port (default
`50000`) so only this backend can reach it. That network setup is outside
what this codebase can configure — it's an infrastructure step your IT/
Basis team owns.

Once deployed, set `CORS_ORIGINS` in `.env` to the actual URL the portal
(`index.html`) is served from, so the browser is allowed to call this API.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/health` | `{ ok, mockMode }` |
| `GET /api/bom-dump.xlsx` | SAP BOM Dump workbook (one tab per FG/sub-assembly) |
| `GET /api/price-list.xlsx` | Price List (ItemCode/GRPORate/LatestGRPODate/PriceListRate/PriceUpdateDate) |
| `GET /api/bp-catalogue.xlsx` | BP Catalogue (Item No./BP Catalog Number/BP Catalog Description/Item Description) |
| `GET /api/fg-price-list.xlsx` | FG Price List (Item No./Price) |

The Input Sheet (commodity rates, cast parts, wattage, assembly rules) is
**not** fetched from SAP B1 — it stays a manual form in the portal, since
it's business logic the costing team enters per run, not ERP master data.

## Files

```
backend/
  server.js              Express app entry, config from .env
  routes/dataRoutes.js    The 4 endpoints above
  src/sapB1Client.js      Session-managed Service Layer HTTP client
  src/sapB1Queries.js     Real B1 queries — the business-specific tuning lives here
  src/assemble.js         Combines raw B1 query results into portal-shaped rows
  src/xlsxBuilders.js     Builds .xlsx files matching app.js's parser exactly
  src/mockData.js         Small fake dataset used when B1_MOCK_MODE=true
```
