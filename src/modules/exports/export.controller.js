const { refreshExports } = require("./export.service");

async function refreshExportsController(req, res) {
  try {
    const result = await refreshExports();
    return res.json(result);
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Failed to refresh exports" });
  }
}

module.exports = {
  refreshExportsController,
};
