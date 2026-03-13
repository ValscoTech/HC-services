const axios = require("axios");
const querystring = require("querystring");
const cheerio = require("cheerio");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../shared/parsers/cookie.parser");
const {
  assertPortalCaseDetailsPresent,
} = require("../../shared/utils/portal-response.util");

async function fetchHighCourtCaseDetails({
  hcservices_sessid,
  jsession_value,
  court_code,
  state_code,
  court_complex_code,
  case_no,
  cino,
  appFlag = "",
}) {
  const targetUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/o_civil_case_history.php";

  const payload = querystring.stringify({
    court_code: court_code,
    state_code: state_code,
    court_complex_code: court_complex_code,
    case_no: case_no,
    cino: cino,
    appFlag: appFlag,
  });

  const cookieHeaderString = `HCSERVICES_SESSID=${hcservices_sessid}; JSESSION=${jsession_value}`;

  const headers = {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookieHeaderString,
    Origin: "https://hcservices.ecourts.gov.in",
    Priority: "u=1, i",
    Referer: "https://hcservices.ecourts.gov.in/",
    "Sec-Ch-Ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Gpc": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Length": Buffer.byteLength(payload).toString(),
  };

  const response = await axios.post(targetUrl, payload, {
    headers: headers,
    timeout: 20000,
  });

  const html = response.data;
  const $ = cheerio.load(html);
  const hasCaseDetails =
    $(".case_details_table").length > 0 ||
    $(".table_r").length > 0 ||
    $(".history_table").length > 0 ||
    $(".order_table").length > 0;

  assertPortalCaseDetailsPresent(html, hasCaseDetails);

  const caseDetails = {};
  const $caseDetailsTable = $(".case_details_table");
  $caseDetailsTable.find("tr").each((i, row) => {
    const tds = $(row).find("td");
    if (tds.length >= 2) {
      const key = $(tds[0]).text().trim().replace(":", "");
      const value = $(tds[1]).text().trim();
      caseDetails[key] = value;
    }
  });

  const caseStatus = {};
  const $caseStatusTable = $(".table_r");
  $caseStatusTable.find("tr").each((i, row) => {
    const tds = $(row).find("td");
    if (tds.length >= 2) {
      const key = $(tds[0]).text().trim().replace(":", "");
      const value = $(tds[1]).text().trim();
      caseStatus[key] = value;
    }
  });

  const petitionerAdvocate = $(".Petitioner_Advocate_table")
    .text()
    .trim()
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const respondentAdvocate = $(".Respondent_Advocate_table")
    .text()
    .trim()
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const hearingHistory = [];
  const $hearingTable = $(".history_table");
  $hearingTable.find("tr").each((i, row) => {
    if (i === 0) return;
    const tds = $(row).find("td");
    if (tds.length >= 5) {
      hearingHistory.push({
        causeListType: $(tds[0]).text().trim(),
        judge: $(tds[1]).text().trim(),
        businessOnDate: $(tds[2]).text().trim(),
        hearingDate: $(tds[3]).text().trim(),
        purpose: $(tds[4]).text().trim(),
      });
    }
  });

  const orders = [];
  const $orderTable = $(".order_table");
  $orderTable.find("tr").each((i, row) => {
    if (i === 0) return;
    const tds = $(row).find("td");
    if (tds.length >= 5) {
      orders.push({
        orderNumber: $(tds[0]).text().trim(),
        orderOn: $(tds[1]).text().trim(),
        judge: $(tds[2]).text().trim(),
        orderDate: $(tds[3]).text().trim(),
        orderLink: $(tds[4]).find("a").attr("href")
          ? "https://hcservices.ecourts.gov.in/hcservices/orders/" +
            $(tds[4]).find("a").attr("href")
          : null,
      });
    }
  });

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    jsession_value ||
    hcservices_sessid;

  const parsedData = {
    caseDetails,
    caseStatus,
    petitionerAdvocate,
    respondentAdvocate,
    hearingHistory,
    orders,
  };

  return {
    sessionID: finalSessionId,
    data: parsedData,
    cookies: updatedCookiesForFrontend,
    raw: html,
    response,
  };
}

module.exports = {
  fetchHighCourtCaseDetails,
};
