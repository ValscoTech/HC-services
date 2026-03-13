const { fetchAdvocateNameSearch } = require("./advocate-name.service");
const { isPortalLookupError } = require("../../../shared/errors/portal.error");

async function getAdvocateNameSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Advocate Name Search request.`);

  const {
    captcha,
    caseStatusSearchType,
    court_code,
    state_code,
    court_complex_code,
    cookies: frontendCookiesObject,
    sessionId: frontendSessionId,
    // search_type=1: by name
    advocate_name,
    // search_type=2: by bar code
    adv_bar_state,
    // search_type=3: by today's case list
    caselist_date_dmy,
    search_type,
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
  if (!search_type) missingFields.push("search_type");
  if (!f) missingFields.push("f");
  if (!court_code) missingFields.push("court_code");
  if (!state_code) missingFields.push("state_code");
  if (!court_complex_code) missingFields.push("court_complex_code");
  if (!cookieHeaderStringForExternalRequest)
    missingFields.push("cookiesString");

  if (search_type === "1" && !advocate_name)
    missingFields.push("advocate_name");
  if (search_type === "2" && !adv_bar_state)
    missingFields.push("adv_bar_state");
  if (search_type === "3" && !caselist_date_dmy)
    missingFields.push("caselist_date_dmy");

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    const result = await fetchAdvocateNameSearch({
      captcha,
      caseStatusSearchType,
      court_code,
      state_code,
      court_complex_code,
      frontendCookiesObject,
      frontendSessionId,
      advocate_name,
      adv_bar_state,
      caselist_date_dmy,
      search_type,
      f,
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
