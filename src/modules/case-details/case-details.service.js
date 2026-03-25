const axios = require("axios");
const querystring = require("querystring");
const cheerio = require("cheerio");

const HC_SERVICES_BASE_URL = "https://hcservices.ecourts.gov.in/hcservices/";
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../shared/parsers/cookie.parser");
const {
  assertPortalCaseDetailsPresent,
} = require("../../shared/utils/portal-response.util");

function parseHtmlLineBlock($element) {
  const rawHtml = $element.html();
  if (!rawHtml) {
    return [];
  }

  return rawHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .split("\n")
    .map((line) => cheerio.load(`<div>${line}</div>`)("div").text().replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeRegistrationNumber(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, "");
}

function buildOrderLink(rawHref, {
  orderOn,
  registrationNumber,
  cino,
  state_code,
  court_code,
  appFlag,
}) {
  if (!rawHref) {
    return null;
  }

  const resolvedUrl = new URL(rawHref, HC_SERVICES_BASE_URL);
  const filename = resolvedUrl.searchParams.get("filename");
  const caseno =
    orderOn ||
    normalizeRegistrationNumber(registrationNumber) ||
    resolvedUrl.searchParams.get("caseno") ||
    "";

  resolvedUrl.pathname = "/hcservices/cases/display_pdf.php";
  resolvedUrl.search = "";

  if (filename) resolvedUrl.searchParams.set("filename", filename);
  resolvedUrl.searchParams.set("caseno", caseno);
  resolvedUrl.searchParams.set("cCode", court_code);
  resolvedUrl.searchParams.set("cino", cino);
  resolvedUrl.searchParams.set("state_code", state_code);
  resolvedUrl.searchParams.set("court_code", court_code);
  resolvedUrl.searchParams.set("appFlag", appFlag);

  return resolvedUrl.toString();
}

function buildCaseCookieHeader(hcservices_sessid, jsession_value) {
  return `HCSERVICES_SESSID=${hcservices_sessid}; JSESSION=${jsession_value}`;
}

function getCaseRequestHeaders(cookieHeaderString) {
  return {
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
  };
}

async function fetchHighCourtOrderPdf({
  hcservices_sessid,
  jsession_value,
  orderLink,
}) {
  const resolvedUrl = new URL(orderLink);
  if (
    resolvedUrl.origin !== "https://hcservices.ecourts.gov.in" ||
    !resolvedUrl.pathname.startsWith("/hcservices/cases/display_pdf.php")
  ) {
    throw new Error("Invalid HC order link");
  }

  const cookieHeaderString = buildCaseCookieHeader(
    hcservices_sessid,
    jsession_value,
  );
  const response = await axios.get(resolvedUrl.toString(), {
    responseType: "arraybuffer",
    headers: {
      ...getCaseRequestHeaders(cookieHeaderString),
      Accept: "application/pdf,*/*",
      Referer: "https://hcservices.ecourts.gov.in/",
    },
    timeout: 20000,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const responseBuffer = Buffer.from(response.data);
  const responseContentType = response.headers["content-type"] || "";
  const isPdf =
    responseContentType.toLowerCase().includes("application/pdf") ||
    responseBuffer.subarray(0, 4).toString() === "%PDF";

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    jsession_value ||
    hcservices_sessid;

  if (!isPdf) {
    const responseText = responseBuffer.toString("utf8");

    return {
      ok: false,
      sessionID: finalSessionId,
      cookies: updatedCookiesForFrontend,
      status: response.status,
      contentType: responseContentType,
      preview: responseText.substring(0, 500),
    };
  }

  return {
    ok: true,
    sessionID: finalSessionId,
    cookies: updatedCookiesForFrontend,
    status: response.status,
    contentType: responseContentType || "application/pdf",
    data: responseBuffer,
  };
}

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

  const cookieHeaderString = buildCaseCookieHeader(
    hcservices_sessid,
    jsession_value,
  );

  const headers = {
    ...getCaseRequestHeaders(cookieHeaderString),
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
      for (let index = 0; index < tds.length - 1; index += 2) {
        const key = $(tds[index]).text().trim().replace(":", "");
        const value = $(tds[index + 1]).text().trim();
        if (key) {
          caseDetails[key] = value;
        }
      }
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

  const petitionerAdvocate = parseHtmlLineBlock($(".Petitioner_Advocate_table"));

  const respondentAdvocate = parseHtmlLineBlock($(".Respondent_Advocate_table"));

  const categoryDetails = {};
  const $categoryDetailsTable = $("#subject_table");
  $categoryDetailsTable.find("tr").each((i, row) => {
    const tds = $(row).find("td");
    if (tds.length >= 2) {
      const key = $(tds[0]).text().trim().replace(":", "");
      const value = $(tds[1]).text().trim();
      if (key) {
        categoryDetails[key] = value;
      }
    }
  });

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
      const orderOn = $(tds[1]).text().trim();
      const rawOrderHref = $(tds[4]).find("a").attr("href");
      orders.push({
        orderNumber: $(tds[0]).text().trim(),
        orderOn,
        judge: $(tds[2]).text().trim(),
        orderDate: $(tds[3]).text().trim(),
        orderLink: buildOrderLink(rawOrderHref, {
          orderOn,
          registrationNumber: caseDetails["Registration Number"],
          cino,
          state_code,
          court_code,
          appFlag,
        }),
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
    categoryDetails,
    hearingHistory,
    orders,
  };

  return {
    sessionID: finalSessionId,
    data: parsedData,
    cookies: updatedCookiesForFrontend,
    raw: html,
  };
}

module.exports = {
  fetchHighCourtCaseDetails,
  fetchHighCourtOrderPdf,
};
