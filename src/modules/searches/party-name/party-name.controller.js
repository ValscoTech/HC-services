const { fetchPartyNameSearch } = require("./party-name.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getPartyNameSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Party Name Search request.`);

  const {
    captcha,
    petres_name,
    rgyear,
    caseStatusSearchType,
    f,
    court_code,
    state_code,
    court_complex_code,
    cookies: frontendCookiesObject,
    sessionId: frontendSessionId,
  } = req.body;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (
    !captcha ||
    !petres_name ||
    !rgyear ||
    !caseStatusSearchType ||
    !f ||
    !court_code ||
    !state_code ||
    !court_complex_code ||
    !cookieHeaderStringForExternalRequest
  ) {
    const missingFields = [];
    if (!captcha) missingFields.push("captcha");
    if (!petres_name) missingFields.push("petres_name");
    if (!rgyear) missingFields.push("rgyear");
    if (!caseStatusSearchType) missingFields.push("caseStatusSearchType");
    if (!f) missingFields.push("f");
    if (!court_code) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!court_complex_code) missingFields.push("court_complex_code");
    if (!cookieHeaderStringForExternalRequest)
      missingFields.push("cookiesString");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    const result = await fetchPartyNameSearch({
      captcha,
      petres_name,
      rgyear,
      caseStatusSearchType,
      f,
      court_code,
      state_code,
      court_complex_code,
      frontendCookiesObject,
      frontendSessionId,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/party-name: ${error.message}`,
    );

    if (isPortalLookupError(error)) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

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
      error: "Party name search failed",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getPartyNameSearch,
};
