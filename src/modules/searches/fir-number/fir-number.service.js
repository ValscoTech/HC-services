const axios = require("axios");
const querystring = require("querystring");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../../shared/parsers/cookie.parser");
const {
  parsePortalShowRecordsResponse,
} = require("../../../shared/utils/portal-response.util");

async function fetchFIRNumberSearch({
  captcha,
  caseStatusSearchType,
  court_code,
  state_code,
  court_complex_code,
  frontendCookiesObject,
  frontendSessionId,
  police_st_code,
  fir_no,
  firyear,
  f,
}) {
  const payload = querystring.stringify({
    action_code: "showRecords",
    court_code,
    state_code,
    court_complex_code,
    captcha,
    caseStatusSearchType,
    police_st_code,
    fir_no: fir_no || "",
    firyear: firyear || "",
    f,
    appFlag: "web",
  });

  const caseVerificationUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/index_qry.php";

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const headersToForward = {
    accept: "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.5",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    origin: "https://hcservices.ecourts.gov.in",
    priority: "u=1, i",
    referer: "https://hcservices.ecourts.gov.in/",
    "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    Cookie: cookieHeaderStringForExternalRequest,
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Content-Length": Buffer.byteLength(payload).toString(),
  };

  const response = await axios.post(caseVerificationUrl, payload, {
    headers: headersToForward,
    timeout: 30000,
  });

  const govData = parsePortalShowRecordsResponse(response.data);

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) || frontendSessionId;

  return {
    sessionID: finalSessionId,
    data: {
      con: govData.con,
    },
    cookies: updatedCookiesForFrontend,
    raw: response.data,
    response,
  };
}

module.exports = {
  fetchFIRNumberSearch,
};
