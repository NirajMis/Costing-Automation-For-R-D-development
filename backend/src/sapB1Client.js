const axios = require("axios");
const https = require("https");

// Thin client for SAP Business One Service Layer (REST/OData).
// Handles login + session-cookie renewal; every other module talks to
// SAP B1 only through client.get(path, params) so there's exactly one
// place that knows about sessions, retries, and TLS settings.
class SapB1Client {
  constructor({ baseUrl, companyDB, username, password, rejectUnauthorized = true }) {
    if (!baseUrl || !companyDB || !username || !password) {
      throw new Error("SapB1Client requires baseUrl, companyDB, username, and password");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.companyDB = companyDB;
    this.username = username;
    this.password = password;
    this.sessionCookie = null;
    this.sessionExpiresAt = 0;
    this.http = axios.create({
      httpsAgent: new https.Agent({ rejectUnauthorized }),
      timeout: 30000,
    });
  }

  async login() {
    const res = await this.http.post(`${this.baseUrl}/Login`, {
      CompanyDB: this.companyDB,
      UserName: this.username,
      Password: this.password,
    });
    const setCookie = res.headers["set-cookie"] || [];
    if (!setCookie.length) throw new Error("SAP B1 login succeeded but returned no session cookie");
    this.sessionCookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    // B1 sessions default to a 30-minute idle timeout — refresh a bit early
    this.sessionExpiresAt = Date.now() + 25 * 60 * 1000;
    return this.sessionCookie;
  }

  async ensureSession() {
    if (!this.sessionCookie || Date.now() > this.sessionExpiresAt) {
      await this.login();
    }
  }

  // path like "/Items", params like { $select: "ItemCode,ItemName", $filter: "..." }
  async get(path, params) {
    await this.ensureSession();
    const doRequest = () =>
      this.http.get(`${this.baseUrl}${path}`, { params, headers: { Cookie: this.sessionCookie } });
    try {
      const res = await doRequest();
      return res.data;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await this.login();
        const res = await doRequest();
        return res.data;
      }
      throw err;
    }
  }

  // Follows Service Layer's @odata.nextLink paging until every page is collected.
  async getAllPages(path, params) {
    let out = [];
    let nextPath = path;
    let nextParams = params;
    while (nextPath) {
      const data = await this.get(nextPath, nextParams);
      out = out.concat(data.value || []);
      const nextLink = data["odata.nextLink"] || data["@odata.nextLink"];
      if (!nextLink) break;
      // nextLink is relative to the service root, e.g. "Items?$skip=20"
      nextPath = "/" + nextLink.replace(/^\/+/, "");
      nextParams = undefined; // params are already encoded into nextLink
    }
    return out;
  }

  async logout() {
    if (!this.sessionCookie) return;
    try {
      await this.http.post(`${this.baseUrl}/Logout`, {}, { headers: { Cookie: this.sessionCookie } });
    } catch (e) {
      // best-effort — don't let logout failure surface as an app error
    }
    this.sessionCookie = null;
    this.sessionExpiresAt = 0;
  }
}

module.exports = SapB1Client;
