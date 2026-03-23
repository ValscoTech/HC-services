const {
  DEFAULT_NO_CASE_DETAILS_MESSAGE,
  DEFAULT_PORTAL_ERROR_MESSAGE,
  createPortalLookupError,
} = require("../errors/portal.error");

const SQL_ERROR_PATTERNS = [
  "sql",
  "syntax error",
  "mysql",
  "mysqli",
  "pdoexception",
  "odbc",
  "warning:",
  "fatal error",
  "uncaught exception",
];

function normalizePortalText(rawData) {
  if (rawData === null || rawData === undefined) {
    return "";
  }

  if (typeof rawData !== "string") {
    return null;
  }

  return rawData.replace(/\s+/g, " ").trim();
}

function hasPortalSqlError(rawData) {
  const normalizedText = normalizePortalText(rawData).toLowerCase();
  return SQL_ERROR_PATTERNS.some((pattern) => normalizedText.includes(pattern));
}

function detectPortalLookupIssue(
  rawData,
  { portalErrorMessage = DEFAULT_PORTAL_ERROR_MESSAGE } = {},
) {
  const normalizedText = normalizePortalText(rawData);

  if (normalizedText === "") {
    return createPortalLookupError(portalErrorMessage, {
      code: "HC_PORTAL_EMPTY_RESPONSE",
      statusCode: 502,
      raw: rawData,
    });
  }

  if (normalizedText === null) {
    return null;
  }

  const lowerText = normalizedText.toLowerCase();

  if (lowerText === "invalid captcha") {
    return createPortalLookupError("Invalid captcha provided for HC services portal", {
      code: "HC_PORTAL_INVALID_CAPTCHA",
      statusCode: 422,
      raw: rawData,
    });
  }

  if (
    lowerText === "there is an error" ||
    lowerText.includes("record not found") ||
    hasPortalSqlError(rawData)
  ) {
    return createPortalLookupError(portalErrorMessage, {
      code: "HC_PORTAL_INVALID_RESPONSE",
      statusCode: 502,
      raw: rawData,
    });
  }

  return null;
}

function normalizePortalConValue(rawCon) {
  let processedCon = rawCon;

  if (
    Array.isArray(processedCon) &&
    processedCon.length === 1 &&
    typeof processedCon[0] === "string"
  ) {
    try {
      const tempParsed = JSON.parse(processedCon[0]);
      if (Array.isArray(tempParsed)) {
        processedCon = tempParsed;
      }
    } catch (error) {}
  } else if (typeof processedCon === "string") {
    try {
      const tempParsed = JSON.parse(processedCon);
      if (
        Array.isArray(tempParsed) &&
        tempParsed.length > 0 &&
        Array.isArray(tempParsed[0])
      ) {
        processedCon = tempParsed[0];
      } else if (Array.isArray(tempParsed)) {
        processedCon = tempParsed;
      }
    } catch (error) {}
  } else if (
    Array.isArray(processedCon) &&
    processedCon.length > 0 &&
    Array.isArray(processedCon[0])
  ) {
    processedCon = processedCon[0];
  }

  return processedCon;
}

function parsePortalShowRecordsResponse(
  rawData,
  {
    portalErrorMessage = DEFAULT_PORTAL_ERROR_MESSAGE,
    noCaseDetailsMessage = DEFAULT_NO_CASE_DETAILS_MESSAGE,
  } = {},
) {
  const knownIssue = detectPortalLookupIssue(rawData, { portalErrorMessage });
  if (knownIssue) {
    throw knownIssue;
  }

  let govData = rawData;

  if (typeof govData === "string") {
    try {
      govData = JSON.parse(govData);
    } catch (error) {
      throw createPortalLookupError(portalErrorMessage, {
        code: "HC_PORTAL_INVALID_JSON",
        statusCode: 502,
        raw: rawData,
        cause: error,
      });
    }
  }

  if (!govData || typeof govData !== "object" || govData.con === undefined) {
    throw createPortalLookupError(portalErrorMessage, {
      code: "HC_PORTAL_MISSING_CON",
      statusCode: 502,
      raw: rawData,
    });
  }

  const normalizedCon = normalizePortalConValue(govData.con);
  if (!Array.isArray(normalizedCon) || normalizedCon.length === 0) {
    throw createPortalLookupError(noCaseDetailsMessage, {
      code: "HC_PORTAL_EMPTY_RESULTS",
      raw: rawData,
    });
  }

  return {
    ...govData,
    con: normalizedCon,
  };
}

function assertPortalCaseDetailsPresent(
  rawData,
  hasCaseDetails,
  {
    portalErrorMessage = DEFAULT_PORTAL_ERROR_MESSAGE,
    noCaseDetailsMessage = DEFAULT_NO_CASE_DETAILS_MESSAGE,
  } = {},
) {
  const knownIssue = detectPortalLookupIssue(rawData, { portalErrorMessage });
  if (knownIssue) {
    throw knownIssue;
  }

  if (!hasCaseDetails) {
    throw createPortalLookupError(noCaseDetailsMessage, {
      code: "HC_PORTAL_EMPTY_CASE_DETAILS",
      raw: rawData,
    });
  }
}

module.exports = {
  detectPortalLookupIssue,
  parsePortalShowRecordsResponse,
  assertPortalCaseDetailsPresent,
};
