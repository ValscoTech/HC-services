const { fetchCnrNumberSearch } = require("./cnr-number.service");

async function getCnrNumberSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling CNR Number Search request.`);

  const { cino, captcha, cookies: frontendCookiesObject } = req.body;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (!cino || !captcha || !cookieHeaderStringForExternalRequest) {
    const missingFields = [];
    if (!cino) missingFields.push("cino");
    if (!captcha) missingFields.push("captcha");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const normalizedCino = String(cino).trim().toUpperCase();

  if (!/^[A-Z0-9]{16}$/.test(normalizedCino)) {
    return res.status(400).json({
      error:
        "Invalid CNR number. It must be exactly 16 alphanumeric characters.",
    });
  }

  try {
    const result = await fetchCnrNumberSearch({
      cino: normalizedCino,
      captcha,
      frontendCookiesObject,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/cnr-number: ${error.message}`,
    );

    if (error.response) {
      console.error(
        `[${errorTimestamp}] Error Response Status: ${error.response.status}`,
      );
      console.error(
        `[${errorTimestamp}] Error Response Data Preview: ${String(
          error.response.data,
        ).substring(0, 500)}...`,
      );
    }

    res.status(500).json({
      error: "Failed to fetch CNR number search result",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getCnrNumberSearch,
};
