const axios = require("axios");
const querystring = require("querystring");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../../shared/parsers/cookie.parser");
const {
  parsePortalShowRecordsResponse,
} = require("../../../shared/utils/portal-response.util");

async function fetchCaseNumberSearch({
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
    court_code: court_code,
    state_code: state_code,
    court_complex_code: court_complex_code,
    caseStatusSearchType: caseStatusSearchType,
    captcha: captcha,
    case_type: case_type,
    case_no: case_no,
    rgyear,
    caseNoType: caseNoType,
    displayOldCaseNo: displayOldCaseNo,
  });

  const headers = {
    accept: "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.5",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookieHeaderStringForExternalRequest,
    origin: "https://hcservices.ecourts.gov.in",
    priority: "u=1, i",
    referer: "https://hcservices.ecourts.gov.in/",
    "sec-ch-ua": '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sec-gpc": "1",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    "Content-Length": Buffer.byteLength(payload).toString(),
  };

  const response = await axios.post(targetUrl, payload, {
    headers: headers,
    timeout: 30000,
  });

  const responsePreview =
    typeof response.data === "string"
      ? response.data.substring(0, 500)
      : JSON.stringify(response.data).substring(0, 500);
  console.log("[HC Case Number] Portal response debug:", {
    status: response.status,
    contentType: response.headers["content-type"],
    dataType: typeof response.data,
    preview: responsePreview,
  });

  const govData = parsePortalShowRecordsResponse(response.data);

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    frontendCookiesObject.JSESSIONID ||
    frontendCookiesObject.JSESSION ||
    frontendCookiesObject.HCSERVICES_SESSID;

  return {
    sessionID: finalSessionId,
    data: {
      con: govData.con,
    },
    cookies: updatedCookiesForFrontend,
    raw: response.data,
  };
}

module.exports = {
  fetchCaseNumberSearch,
};
