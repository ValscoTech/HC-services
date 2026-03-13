const express = require("express");
const corsMiddleware = require("./config/cors");
const requestLogger = require("./middleware/request-logger.middleware");

const portalRoutes = require("./modules/portal/portal.routes");
const caseNumberRoutes = require("./modules/searches/case-number/case-number.routes");
const partyNameRoutes = require("./modules/searches/party-name/party-name.routes");
const cnrNumberRoutes = require("./modules/searches/cnr-number/cnr-number.routes");
const filingNumberRoutes = require("./modules/searches/filing-number/filing-number.routes");
const advocateNameRoutes = require("./modules/searches/advocate-name/advocate-name.routes");
const firNumberRoutes = require("./modules/searches/fir-number/fir-number.routes");
const actTypeRoutes = require("./modules/searches/act-type/act-type.routes");
const caseTypeRoutes = require("./modules/searches/case-type/case-type.routes");
const caseDetailsRoutes = require("./modules/case-details/case-details.routes");
const exportRoutes = require("./modules/exports/export.routes");

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use("/api", portalRoutes);
app.use("/api", caseNumberRoutes);
app.use("/api", partyNameRoutes);
app.use("/api", cnrNumberRoutes);
app.use("/api", filingNumberRoutes);
app.use("/api", advocateNameRoutes);
app.use("/api", firNumberRoutes);
app.use("/api", actTypeRoutes);
app.use("/api", caseTypeRoutes);
app.use("/api", caseDetailsRoutes);
app.use("/api", exportRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

module.exports = app;
