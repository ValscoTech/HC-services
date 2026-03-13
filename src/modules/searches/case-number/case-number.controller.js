const { fetchCaseNumberSearch } = require("./case-number.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getCaseNumberSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Case Number Search request.`);

  const {
    court_code,
    state_code,
    court_complex_code,
    caseStatusSearchType,
    captcha,
    case_type,
    case_no,
    rgyear,
    caseNoType = "new",
    displayOldCaseNo = "NO",
    cookies: frontendCookiesObject,
  } = req.body;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (
    !court_code ||
    !state_code ||
    !court_complex_code ||
    !caseStatusSearchType ||
    !captcha ||
    !case_type ||
    !case_no ||
    !rgyear ||
    !cookieHeaderStringForExternalRequest
  ) {
    const missingFields = [];
    if (!court_code) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!court_complex_code) missingFields.push("court_complex_code");
    if (!caseStatusSearchType) missingFields.push("caseStatusSearchType");
    if (!captcha) missingFields.push("captcha");
    if (!case_type) missingFields.push("case_type");
    if (!case_no) missingFields.push("case_no");
    if (!rgyear) missingFields.push("rgyear");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    const result = await fetchCaseNumberSearch({
      court_code,
      state_code,
      court_complex_code,
      caseStatusSearchType,
      captcha,
      case_type,
      case_no,
      rgyear,
      caseNoType,
      displayOldCaseNo,
      frontendCookiesObject,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/case-number: ${error.message}`,
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
      error: "Failed to fetch case number search results",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getCaseNumberSearch,
};
