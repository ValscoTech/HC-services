const { fetchCaseTypeSearch } = require("./case-type.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getCaseTypeSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Case Type Search request.`);

  const {
    captcha,
    caseStatusSearchType: rawCaseStatusSearchType = "CScaseType",
    court_code: rawCourtCode,
    state_code,
    court_complex_code: rawCourtComplexCode,
    cookies: frontendCookiesObject,
    sessionId: frontendSessionId,
    case_type,
    search_year,
    f,
  } = req.body;

  const courtCodeNormalized = String(rawCourtCode || "").trim();
  const caseStatusSearchType =
    String(rawCaseStatusSearchType || "").trim() || "CScaseType";
  const derivedCourtComplexCode = courtCodeNormalized.includes("@")
    ? courtCodeNormalized.split("@")[0].trim()
    : "";
  const courtComplexCodeNormalized =
    String(rawCourtComplexCode || "").trim() || derivedCourtComplexCode;
  const caseTypeNormalized = String(case_type || "").trim();
  const searchYearNormalized = String(search_year || "").trim();
  const statusFilterNormalized = String(f || "").trim();

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const missingFields = [];
  if (!captcha) missingFields.push("captcha");
  if (!caseStatusSearchType) missingFields.push("caseStatusSearchType");
  if (!statusFilterNormalized) missingFields.push("f");
  if (!courtCodeNormalized) missingFields.push("court_code");
  if (!state_code) missingFields.push("state_code");
  if (!courtComplexCodeNormalized) missingFields.push("court_complex_code");
  if (!caseTypeNormalized) missingFields.push("case_type");
  if (!searchYearNormalized) missingFields.push("search_year");
  if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  if (caseStatusSearchType !== "CScaseType") {
    return res.status(400).json({
      error:
        "Invalid caseStatusSearchType. Case type search requires CScaseType.",
    });
  }

  if (!/^\d{4}$/.test(searchYearNormalized)) {
    return res.status(400).json({
      error: "Invalid search year. It must be exactly 4 digits.",
    });
  }

  if (
    statusFilterNormalized !== "Pending" &&
    statusFilterNormalized !== "Disposed"
  ) {
    return res.status(400).json({
      error: "Invalid f value. It must be Pending or Disposed.",
    });
  }

  try {
    const result = await fetchCaseTypeSearch({
      captcha,
      caseStatusSearchType,
      court_code: courtCodeNormalized,
      state_code,
      court_complex_code: courtComplexCodeNormalized,
      frontendCookiesObject,
      frontendSessionId,
      case_type: caseTypeNormalized,
      search_year: searchYearNormalized,
      f: statusFilterNormalized,
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
