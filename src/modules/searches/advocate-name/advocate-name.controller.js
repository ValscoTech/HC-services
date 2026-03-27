const { fetchAdvocateNameSearch } = require("./advocate-name.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getAdvocateNameSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Advocate Name Search request.`);

  const {
    captcha,
    caseStatusSearchType: rawCaseStatusSearchType = "CSAdvName",
    court_code: rawCourtCode,
    state_code,
    court_complex_code: rawCourtComplexCode,
    cookies: frontendCookiesObject,
    sessionId: frontendSessionId,
    advocate_name,
    adv_bar_state,
    caselist_date_dmy,
    caselist_date,
    search_type: rawSearchType,
    f,
  } = req.body;

  const courtCodeNormalized = String(rawCourtCode || "").trim();
  const derivedCourtComplexCode = courtCodeNormalized.includes("@")
    ? courtCodeNormalized.split("@")[0].trim()
    : "";
  const courtComplexCodeNormalized =
    String(rawCourtComplexCode || "").trim() || derivedCourtComplexCode;

  const allowedCaseStatusSearchTypes = new Set([
    "CSAdvName",
    "CSAdvNamebar",
    "CSAdvNameyear",
  ]);
  const caseStatusSearchTypeInput = String(
    rawCaseStatusSearchType || "",
  ).trim();
  const caseStatusSearchType = allowedCaseStatusSearchTypes.has(
    caseStatusSearchTypeInput,
  )
    ? "CSAdvName"
    : caseStatusSearchTypeInput;

  const advocateNameNormalized = String(advocate_name || "").trim();
  const advBarStateNormalized = String(adv_bar_state || "").trim();
  const caselistDateNormalized = String(
    caselist_date_dmy || caselist_date || "",
  ).trim();

  let searchTypeNormalized = String(rawSearchType || "").trim();
  if (!searchTypeNormalized) {
    if (caseStatusSearchTypeInput === "CSAdvNamebar") {
      searchTypeNormalized = "2";
    } else if (caseStatusSearchTypeInput === "CSAdvNameyear") {
      searchTypeNormalized = "3";
    } else if (advocateNameNormalized) {
      searchTypeNormalized = "1";
    } else if (caselistDateNormalized) {
      searchTypeNormalized = "3";
    } else if (advBarStateNormalized) {
      searchTypeNormalized = "2";
    }
  }

  let statusFilterNormalized = String(f || "").trim();
  if (!statusFilterNormalized && searchTypeNormalized === "3") {
    statusFilterNormalized = "date_case_list";
  }

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const missingFields = [];
  if (!captcha) missingFields.push("captcha");
  if (!caseStatusSearchType) missingFields.push("caseStatusSearchType");
  if (!searchTypeNormalized) missingFields.push("search_type");
  if (!statusFilterNormalized) missingFields.push("f");
  if (!courtCodeNormalized) missingFields.push("court_code");
  if (!state_code) missingFields.push("state_code");
  if (!courtComplexCodeNormalized) missingFields.push("court_complex_code");
  if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

  if (searchTypeNormalized === "1" && !advocateNameNormalized)
    missingFields.push("advocate_name");
  if (searchTypeNormalized === "2" && !advBarStateNormalized)
    missingFields.push("adv_bar_state");
  if (searchTypeNormalized === "3" && !caselistDateNormalized)
    missingFields.push("caselist_date_dmy");

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  if (caseStatusSearchType !== "CSAdvName") {
    return res.status(400).json({
      error:
        "Invalid caseStatusSearchType. Advocate search requires CSAdvName, CSAdvNamebar, or CSAdvNameyear.",
    });
  }

  if (
    searchTypeNormalized !== "1" &&
    searchTypeNormalized !== "2" &&
    searchTypeNormalized !== "3"
  ) {
    return res.status(400).json({
      error: "Invalid search_type. It must be 1, 2, or 3.",
    });
  }

  if (
    (searchTypeNormalized === "1" || searchTypeNormalized === "2") &&
    !["Pending", "Disposed", "Both"].includes(statusFilterNormalized)
  ) {
    return res.status(400).json({
      error: "Invalid f value. For advocate search it must be Pending, Disposed, or Both.",
    });
  }

  if (searchTypeNormalized === "3" && statusFilterNormalized !== "date_case_list") {
    return res.status(400).json({
      error: "Invalid f value. Date case list search requires date_case_list.",
    });
  }

  try {
    const result = await fetchAdvocateNameSearch({
      captcha,
      caseStatusSearchType,
      court_code: courtCodeNormalized,
      state_code,
      court_complex_code: courtComplexCodeNormalized,
      frontendCookiesObject,
      frontendSessionId,
      advocate_name: advocateNameNormalized,
      adv_bar_state: advBarStateNormalized,
      caselist_date_dmy: caselistDateNormalized,
      search_type: searchTypeNormalized,
      f: statusFilterNormalized,
    });

    res.json(result);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/advocate-name: ${error.message}`,
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
      error: "Advocate name search failed",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getAdvocateNameSearch,
};
