const { fetchFilingNumberSearch } = require("./filing-number.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getFilingNumberSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Filing Number Search request.`);

  const {
    court_code: rawCourtCode,
    state_code,
    court_complex_code: rawCourtComplexCode,
    caseStatusSearchType: rawCaseStatusSearchType = "CSfilingNumber",
    captcha,
    case_no,
    rgyear,
    case_type = "",
    cookies: frontendCookiesObject,
  } = req.body;

  const courtCodeNormalized = String(rawCourtCode || "").trim();
  const caseStatusSearchType =
    String(rawCaseStatusSearchType || "").trim() || "CSfilingNumber";
  const derivedCourtComplexCode = courtCodeNormalized.includes("@")
    ? courtCodeNormalized.split("@")[0].trim()
    : "";
  const courtComplexCodeNormalized =
    String(rawCourtComplexCode || "").trim() || derivedCourtComplexCode;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (
    !courtCodeNormalized ||
    !state_code ||
    !courtComplexCodeNormalized ||
    !captcha ||
    !case_no ||
    !rgyear ||
    !cookieHeaderStringForExternalRequest
  ) {
    const missingFields = [];
    if (!courtCodeNormalized) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!courtComplexCodeNormalized) missingFields.push("court_complex_code");
    if (!captcha) missingFields.push("captcha");
    if (!case_no) missingFields.push("case_no");
    if (!rgyear) missingFields.push("rgyear");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  if (
    caseStatusSearchType !== "CSfilingNumber" &&
    caseStatusSearchType !== "CSFilingNumber"
  ) {
    return res.status(400).json({
      error:
        "Invalid caseStatusSearchType. Filing number search requires CSfilingNumber.",
    });
  }

  const caseNoNormalized = String(case_no).trim();
  const regYearNormalized = String(rgyear).trim();

  if (!/^\d{1,7}$/.test(caseNoNormalized)) {
    return res.status(400).json({
      error:
        "Invalid case number. It must contain only digits and max length 7.",
    });
  }

  if (!/^\d{4}$/.test(regYearNormalized)) {
    return res.status(400).json({
      error: "Invalid registration year. It must be exactly 4 digits.",
    });
  }

  try {
    const result = await fetchFilingNumberSearch({
      court_code: courtCodeNormalized,
      state_code,
      court_complex_code: courtComplexCodeNormalized,
      caseStatusSearchType: "CSfilingNumber",
      captcha,
      case_no: caseNoNormalized,
      rgyear: regYearNormalized,
      case_type,
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
