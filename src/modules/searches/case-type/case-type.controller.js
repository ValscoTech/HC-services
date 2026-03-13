const { fetchCaseTypeSearch } = require("./case-type.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getCaseTypeSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Case Type Search request.`);

  const {
    captcha,
    caseStatusSearchType,
    court_code,
    state_code,
    court_complex_code,
    cookies: frontendCookiesObject,
    sessionId: frontendSessionId,
    case_type,
    search_year,
    f,
  } = req.body;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const missingFields = [];
  if (!captcha) missingFields.push("captcha");
  if (!caseStatusSearchType) missingFields.push("caseStatusSearchType");
  if (!f) missingFields.push("f");
  if (!court_code) missingFields.push("court_code");
  if (!state_code) missingFields.push("state_code");
  if (!court_complex_code) missingFields.push("court_complex_code");
  if (!case_type) missingFields.push("case_type");
  if (!search_year) missingFields.push("search_year");
  if (!cookieHeaderStringForExternalRequest)
    missingFields.push("cookiesString");

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    const result = await fetchCaseTypeSearch({
      captcha,
      caseStatusSearchType,
      court_code,
      state_code,
      court_complex_code,
      frontendCookiesObject,
      frontendSessionId,
      case_type,
      search_year,
      f,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/case-type: ${error.message}`,
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
      error: "Case type search failed",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getCaseTypeSearch,
};
