require("dotenv").config();
const express = require("express");
const cors = require("cors");
const SapB1Client = require("./src/sapB1Client");
const createDataRoutes = require("./routes/dataRoutes");

const config = {
  port: Number(process.env.PORT) || 4000,
  mockMode: (process.env.B1_MOCK_MODE ?? "true") !== "false",
  b1: {
    baseUrl: process.env.B1_SERVICE_LAYER_URL,
    companyDB: process.env.B1_COMPANY_DB,
    username: process.env.B1_USERNAME,
    password: process.env.B1_PASSWORD,
    rejectUnauthorized: (process.env.B1_TLS_REJECT_UNAUTHORIZED ?? "true") !== "false",
  },
  priceListId: process.env.B1_PRICE_LIST_ID || "1",
  fgPriceListId: process.env.B1_FG_PRICE_LIST_ID,
  fgItemGroupCode: process.env.B1_FG_ITEM_GROUP_CODE,
  grpoLookbackDays: Number(process.env.B1_GRPO_LOOKBACK_DAYS) || 400,
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
};

let client = null;
function getClient() {
  if (config.mockMode) return null;
  if (!client) client = new SapB1Client(config.b1);
  return client;
}

if (!config.mockMode) {
  const missing = ["baseUrl", "companyDB", "username", "password"].filter((k) => !config.b1[k]);
  if (missing.length) {
    console.error(
      `B1_MOCK_MODE=false but missing .env values: ${missing.join(", ")}. ` +
        `Either fill in .env (see .env.example) or set B1_MOCK_MODE=true.`
    );
    process.exit(1);
  }
}

const app = express();
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
  })
);
app.use("/api", createDataRoutes({ getClient, config }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message || "Unexpected error",
    hint: config.mockMode
      ? undefined
      : "Check B1_SERVICE_LAYER_URL/COMPANY_DB/credentials in .env, and that this server can reach the SAP B1 host on its Service Layer port.",
  });
});

app.listen(config.port, () => {
  console.log(`Costing Portal backend listening on :${config.port} (mock mode: ${config.mockMode})`);
  if (config.mockMode) {
    console.log("Serving mock data — set B1_MOCK_MODE=false in .env once SAP B1 Service Layer access is confirmed.");
  }
});
