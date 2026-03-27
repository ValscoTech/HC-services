const axios = require("axios");
const querystring = require("querystring");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../../shared/parsers/cookie.parser");
const {
  parsePortalShowRecordsResponse,
} = require("../../../shared/utils/portal-response.util");

async function fetchFilingNumberSearch({
  court_code,
  state_code,
  court_complex_code,
  caseStatusSearchType = "CSfilingNumber",
  captcha,
  case_no,
  rgyear,
  case_type = "",
  frontendCookiesObject,
}) {
  const targetUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/index_qry.php?action_code=showRecords";

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const payload = querystring.stringify({
    court_code,
    state_code,
    court_complex_code,
    caseStatusSearchType,
    captcha,
    case_type,
    case_no,
    rgyear,
  });

  const headers = {
    accept: "application/json, text/javascript, */*; q=0.01",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookieHeaderStringForExternalRequest,
    origin: "https://hcservices.ecourts.gov.in",
    referer: "https://hcservices.ecourts.gov.in/",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "x-requested-with": "XMLHttpRequest",
  };

  const response = await axios.post(targetUrl, payload, {
    headers,
    timeout: 30000,
  });

  const govData = parsePortalShowRecordsResponse(response.data);

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const mergedCookiesForFrontend = {
    ...(frontendCookiesObject || {}),
    ...(updatedCookiesForFrontend || {}),
  };

  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    getSessionIdFromCookies(frontendCookiesObject) ||
    frontendCookiesObject?.JSESSIONID ||
    frontendCookiesObject?.JSESSION ||
    frontendCookiesObject?.HCSERVICES_SESSID ||
    null;

  return {
    sessionID: finalSessionId,
    data: {
      con: govData.con,
    },
    cookies: mergedCookiesForFrontend,
    raw: response.data,
  };
}

module.exports = {
  fetchFilingNumberSearch,
};
