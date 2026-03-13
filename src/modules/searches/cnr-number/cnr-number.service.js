const axios = require("axios");
const querystring = require("querystring");
const cheerio = require("cheerio");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../../shared/parsers/cookie.parser");
const {
  DEFAULT_NO_CASE_DETAILS_MESSAGE,
  DEFAULT_PORTAL_ERROR_MESSAGE,
} = require("../../../shared/errors/portal.error");
const {
  assertPortalCaseDetailsPresent,
  detectPortalLookupIssue,
} = require("../../../shared/utils/portal-response.util");

async function fetchCnrNumberSearch({ cino, captcha, frontendCookiesObject }) {
  const targetUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/index_qry.php";

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const payload = querystring.stringify({
    captcha,
    cino: String(cino).toUpperCase(),
    appFlag: "web",
    action_code: "fetchStateDistCourtNew",
    caseStatusSearchType: "CNRNumber",
  });

  const headers = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.5",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookieHeaderStringForExternalRequest,
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
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Content-Length": Buffer.byteLength(payload).toString(),
  };

  const response = await axios.post(targetUrl, payload, {
    headers,
    timeout: 30000,
  });

  const rawData = response.data;
  const textData = typeof rawData === "string" ? rawData.trim() : "";

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    frontendCookiesObject?.JSESSIONID ||
    frontendCookiesObject?.JSESSION ||
    frontendCookiesObject?.HCSERVICES_SESSID ||
    null;

  const knownIssue = detectPortalLookupIssue(rawData, {
    portalErrorMessage: DEFAULT_PORTAL_ERROR_MESSAGE,
  });
  if (knownIssue) {
    return {
      sessionID: finalSessionId,
      cookies: updatedCookiesForFrontend,
      status: "ERROR",
      message: knownIssue.message,
      code: knownIssue.code,
      raw: rawData,
    };
  }

  // If portal returns an HTML page fragment, parse it
  const $ = cheerio.load(rawData);

  const hasCaseDetails =
    $(".case_details_table").length > 0 ||
    $(".table_r").length > 0 ||
    $(".history_table").length > 0 ||
    $(".order_table").length > 0;

  try {
    assertPortalCaseDetailsPresent(rawData, hasCaseDetails, {
      portalErrorMessage: DEFAULT_PORTAL_ERROR_MESSAGE,
      noCaseDetailsMessage: DEFAULT_NO_CASE_DETAILS_MESSAGE,
    });
  } catch (error) {
    return {
      sessionID: finalSessionId,
      cookies: updatedCookiesForFrontend,
      status: "ERROR",
      message: error.message,
      code: error.code,
      raw: rawData,
    };
  }

  const caseDetails = {};
  $(".case_details_table")
    .find("tr")
    .each((i, row) => {
      const tds = $(row).find("td");
      if (tds.length >= 2) {
        const key = $(tds[0]).text().trim().replace(":", "");
        const value = $(tds[1]).text().trim();
        caseDetails[key] = value;
      }
    });

  const caseStatus = {};
  $(".table_r")
    .find("tr")
    .each((i, row) => {
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
  $(".history_table")
    .find("tr")
    .each((i, row) => {
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
  $(".order_table")
    .find("tr")
    .each((i, row) => {
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

  return {
    sessionID: finalSessionId,
    cookies: updatedCookiesForFrontend,
    status: "SUCCESS",
    data: {
      caseDetails,
      caseStatus,
      petitionerAdvocate,
      respondentAdvocate,
      hearingHistory,
      orders,
    },
    raw: rawData,
  };
}

module.exports = {
  fetchCnrNumberSearch,
};
