const axios = require("axios");
const querystring = require("querystring");
const { agent } = require("../../config/http");
const {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
} = require("../../shared/parsers/cookie.parser");
const {
  DEFAULT_NO_CASE_DETAILS_MESSAGE,
  DEFAULT_PORTAL_ERROR_MESSAGE,
  createPortalLookupError,
} = require("../../shared/errors/portal.error");
const {
  detectPortalLookupIssue,
} = require("../../shared/utils/portal-response.util");

async function fetchHighCourtBenches({ state_code, appFlag = "web" }) {
  const targetUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/index_qry.php";

  const captchaSession = await fetchHighCourtCaptcha();
  const cookieHeaderStringForExternalRequest = Object.entries(
    captchaSession.cookies || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const payload = querystring.stringify({
    action_code: "fillHCBench",
    state_code: state_code,
    appFlag: appFlag,
  });

  const headers = {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    Cookie: cookieHeaderStringForExternalRequest,
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

  const response = await axios.post(targetUrl, payload, {
    headers,
    timeout: 15000,
  });

  const responseData = response.data;
  const portalIssue = detectPortalLookupIssue(responseData, {
    portalErrorMessage: DEFAULT_PORTAL_ERROR_MESSAGE,
  });
  if (portalIssue) {
    throw portalIssue;
  }
  const benches = [];

  if (
    typeof responseData === "string" &&
    responseData.includes("~") &&
    responseData.includes("#")
  ) {
    const items = responseData.split("#");
    items.forEach((item) => {
      const parts = item.split("~");
      if (parts.length === 2) {
        const code = parts[0].trim();
        const name = parts[1].trim();
        if (code !== "" && name !== "Select Bench") {
          benches.push({ code, name });
        }
      }
    });
  }

  if (benches.length === 0) {
    throw createPortalLookupError(DEFAULT_NO_CASE_DETAILS_MESSAGE, {
      code: "HC_PORTAL_EMPTY_BENCHES",
      statusCode: 404,
      raw: responseData,
    });
  }

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const mergedCookies = {
    ...(captchaSession.cookies || {}),
    ...(updatedCookiesForFrontend || {}),
  };
  const sessionID =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    getSessionIdFromCookies(captchaSession.cookies) ||
    captchaSession.sessionId ||
    null;

  return {
    benches,
    cookies: mergedCookies,
    sessionID,
    raw: responseData,
    response,
  };
}

async function fetchHighCourtCaptcha() {
  const captchaUrl =
    "https://hcservices.ecourts.gov.in/hcservices/securimage/securimage_show.php?135=null";

  const axiosConfig = {
    responseType: "arraybuffer",
    httpsAgent: agent,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://hcservices.ecourts.gov.in/",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "same-origin",
      Priority: "u=1, i",
    },
    timeout: 20000,
    validateStatus: function (status) {
      return (status >= 200 && status < 300) || status === 302;
    },
  };

  const fetchCaptchaWithRetry = async (maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let response = await axios.get(captchaUrl, axiosConfig);

        if (response.status === 302 && response.headers.location) {
          const redirectUrl = response.headers.location;
          response = await axios.get(redirectUrl, axiosConfig);
        }

        return response;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  };

  const response = await fetchCaptchaWithRetry();
  const captchaImageBase64 = Buffer.from(response.data).toString("base64");
  const contentType = response.headers["content-type"] || "image/png";

  const setCookieHeaders = response.headers["set-cookie"];
  const parsedCookies = parseSetCookieHeaders(setCookieHeaders);
  const sessionId = getSessionIdFromCookies(parsedCookies);

  return {
    captchaImageBase64: `data:${contentType};base64,${captchaImageBase64}`,
    cookies: parsedCookies,
    sessionId,
    response,
  };
}

async function fetchCaseTypes({
  court_code,
  state_code,
  frontendCookiesObject,
}) {
  const targetUrl =
    "https://hcservices.ecourts.gov.in/hcservices/cases_qry/index_qry.php?action_code=fillCaseType";

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  const payload = querystring.stringify({
    court_code: court_code,
    state_code: state_code,
  });

  const headers = {
    accept: "*/*",
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
    headers,
    timeout: 15000,
  });

  let responseData = response.data;
  const portalIssue = detectPortalLookupIssue(responseData, {
    portalErrorMessage: DEFAULT_PORTAL_ERROR_MESSAGE,
  });
  if (portalIssue) {
    throw portalIssue;
  }
  const caseTypes = [];

  if (
    typeof responseData === "string" &&
    responseData.includes("~") &&
    responseData.includes("#")
  ) {
    const items = responseData.split("#");
    items.forEach((item) => {
      const parts = item.split("~");
      if (parts.length === 2) {
        const code = parts[0].trim();
        const name = parts[1].trim();
        if (code !== "" && name !== "Select Case Type") {
          caseTypes.push({ code: code, name: name });
        }
      }
    });
  }

  if (caseTypes.length === 0) {
    throw createPortalLookupError(DEFAULT_NO_CASE_DETAILS_MESSAGE, {
      code: "HC_PORTAL_EMPTY_CASE_TYPES",
      statusCode: 404,
      raw: responseData,
    });
  }

  const newSetCookieHeaders = response.headers["set-cookie"];
  const updatedCookiesForFrontend = parseSetCookieHeaders(newSetCookieHeaders);
  const finalSessionId =
    getSessionIdFromCookies(updatedCookiesForFrontend) ||
    frontendCookiesObject.JSESSIONID ||
    frontendCookiesObject.JSESSION ||
    frontendCookiesObject.HCSERVICES_SESSID;

  return {
    caseTypes,
    cookies: updatedCookiesForFrontend,
    sessionID: finalSessionId,
    raw: responseData,
    response,
  };
}

module.exports = {
  fetchHighCourtBenches,
  fetchHighCourtCaptcha,
  fetchCaseTypes,
};
