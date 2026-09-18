// Small, clearly-fake dataset used when B1_MOCK_MODE=true (the default
// until your SAP B1 Service Layer access is confirmed). Deliberately
// distinct numbers from any real product, so nobody mistakes this for
// live data — it exists purely to prove the fetch → xlsx → portal-engine
// pipeline works end-to-end before SAP B1 credentials exist.

const bomTrees = [
  {
    code: "DEMO-FG-001",
    sheetName: "DEMO-FG-001",
    description: "DEMO Streetlight 100W",
    lines: [
      { code: "DEMO-HSG-01", description: "DEMO Die-cast Housing", quantity: 1, uom: "NOS", unitPrice: 320 },
      { code: "DEMO-LENS-01", description: "DEMO PC Lens", quantity: 1, uom: "NOS", unitPrice: 45 },
      { code: "DEMO-DRVR-01", description: "DEMO MI Driver 100W", quantity: 1, uom: "NOS", unitPrice: 0 },
      { code: "DEMO-SCR-01", description: "DEMO SS Screw M4x10", quantity: 6, uom: "NOS", unitPrice: 0.3 },
      { code: "DEMO-CTN-01", description: "DEMO Master Carton", quantity: 1, uom: "NOS", unitPrice: 22 },
    ],
  },
  {
    code: "DEMO-DRVR-01",
    sheetName: "Driver",
    description: "DEMO MI Driver 100W",
    lines: [
      { code: "DEMO-PCB-01", description: "DEMO Driver PCB", quantity: 1, uom: "NOS", unitPrice: 38 },
      { code: "DEMO-CAP-01", description: "DEMO Electrolytic Cap", quantity: 2, uom: "NOS", unitPrice: 6.5 },
      { code: "DEMO-RES-01", description: "DEMO Resistor 10K", quantity: 4, uom: "NOS", unitPrice: 0.1 },
    ],
  },
];

const priceListRows = [
  { itemCode: "DEMO-HSG-01", grpoRate: 318, latestGrpoDate: "2026-07-12", priceListRate: 322, priceUpdateDate: "2026-08-01" },
  { itemCode: "DEMO-LENS-01", grpoRate: 44, latestGrpoDate: "2026-06-20", priceListRate: 45, priceUpdateDate: "2026-08-01" },
  { itemCode: "DEMO-PCB-01", grpoRate: 37.5, latestGrpoDate: "2026-07-30", priceListRate: 38, priceUpdateDate: "2026-08-01" },
  { itemCode: "DEMO-FG-001", grpoRate: null, latestGrpoDate: null, priceListRate: 512, priceUpdateDate: "2026-08-15" },
];

const bpCatalogueRows = [
  { itemNo: "DEMO-FG-001", bpCatalogNumber: "919600000001", bpCatalogDescription: "DEMO Streetlight 100W CW", itemDescription: "DEMO 100W Streetlight" },
];

const fgPriceListRows = [{ itemNo: "DEMO-FG-001", price: 495.5 }];

module.exports = { bomTrees, priceListRows, bpCatalogueRows, fgPriceListRows };
