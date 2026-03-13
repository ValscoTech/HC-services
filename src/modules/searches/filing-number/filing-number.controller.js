const { fetchFilingNumberSearch } = require("./filing-number.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getFilingNumberSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Filing Number Search request.`);

  const {
    court_code,
    state_code,
    court_complex_code,
    captcha,
    filing_no,
    filyear,
    filing_case_type = "",
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
    !captcha ||
    !filing_no ||
    !filyear ||
    !cookieHeaderStringForExternalRequest
  ) {
    const missingFields = [];
    if (!court_code) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!court_complex_code) missingFields.push("court_complex_code");
    if (!captcha) missingFields.push("captcha");
    if (!filing_no) missingFields.push("filing_no");
    if (!filyear) missingFields.push("filyear");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const filingNoNormalized = String(filing_no).trim();
  const filingYearNormalized = String(filyear).trim();

  if (!/^\d{1,7}$/.test(filingNoNormalized)) {
    return res.status(400).json({
      error:
        "Invalid filing number. It must contain only digits and max length 7.",
    });
  }

  if (!/^\d{4}$/.test(filingYearNormalized)) {
    return res.status(400).json({
      error: "Invalid filing year. It must be exactly 4 digits.",
    });
  }

  try {
    const result = await fetchFilingNumberSearch({
      court_code,
      state_code,
      court_complex_code,
      captcha,
      filing_no: filingNoNormalized,
      filyear: filingYearNormalized,
      filing_case_type,
      frontendCookiesObject,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/filing-number: ${error.message}`,
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
      error: "Failed to fetch filing number search results",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getFilingNumberSearch,
};
