const {
  fetchHighCourtCaseDetails,
  fetchHighCourtOrderPdf,
} = require("./case-details.service");
const { isPortalLookupError } = require("../../shared/errors/portal.error");

function buildOrderPdfProxyUrl(req, {
  orderLink,
  hcservices_sessid,
  jsession_value,
}) {
  if (!orderLink || !hcservices_sessid || !jsession_value) {
    return null;
  }

  const searchParams = new URLSearchParams({
    orderLink,
    hcservices_sessid,
    jsession_value,
  });

  return `/api/case/orders/highcourt/pdf?${searchParams.toString()}`;
}

async function getHighCourtCaseDetails(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling High Court Case Details request.`);

  const requestBody = req.body || {};
  const {
    hcservices_sessid: rawHcservicesSessid,
    jsession_value: rawJsessionValue,
    court_code,
    state_code,
    court_complex_code,
    case_no,
    cino,
    appFlag = "",
    cookies,
  } = requestBody;
  const hcservices_sessid =
    rawHcservicesSessid || cookies?.HCSERVICES_SESSID || null;
  const jsession_value =
    rawJsessionValue || cookies?.JSESSION || cookies?.JSESSIONID || null;

  if (
    !hcservices_sessid ||
    !jsession_value ||
    !court_code ||
    !state_code ||
    !court_complex_code ||
    !case_no ||
    !cino
  ) {
    const missingFields = [];
    if (!hcservices_sessid) missingFields.push("hcservices_sessid");
    if (!jsession_value) missingFields.push("jsession_value");
    if (!court_code) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!court_complex_code) missingFields.push("court_complex_code");
    if (!case_no) missingFields.push("case_no");
    if (!cino) missingFields.push("cino");

    return res.status(400).json({
      error: `Missing required parameters: ${missingFields.join(", ")}`,
    });
  }

  try {
    const result = await fetchHighCourtCaseDetails({
      hcservices_sessid,
      jsession_value,
      court_code,
      state_code,
      court_complex_code,
      case_no,
      cino,
      appFlag,
    });
    const responseHcservicesSessid =
      result.cookies?.HCSERVICES_SESSID || hcservices_sessid;
    const responseJsessionValue =
      result.cookies?.JSESSION || result.cookies?.JSESSIONID || jsession_value;
    const ordersWithProxyUrl = (result.data?.orders || []).map((order) => ({
      ...order,
      pdfProxyUrl: buildOrderPdfProxyUrl(req, {
        orderLink: order.orderLink,
        hcservices_sessid: responseHcservicesSessid,
        jsession_value: responseJsessionValue,
      }),
    }));

    res.json({
      ...result,
      data: {
        ...result.data,
        orders: ordersWithProxyUrl,
      },
    });
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/case/details/highcourt: ${error.message}`,
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
      error: "Failed to fetch case details",
      details: error.message,
      code: error.code,
    });
  }
}

async function getHighCourtOrderPdf(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling High Court Order PDF request.`);

  const requestBody = req.body || {};
  const requestQuery = req.query || {};
  const {
    hcservices_sessid: rawHcservicesSessid,
    jsession_value: rawJsessionValue,
    orderLink,
    cookies,
  } = {
    ...requestBody,
    ...requestQuery,
    cookies: requestBody.cookies || undefined,
  };
  const hcservices_sessid =
    rawHcservicesSessid || cookies?.HCSERVICES_SESSID || null;
  const jsession_value =
    rawJsessionValue || cookies?.JSESSION || cookies?.JSESSIONID || null;

  if (!hcservices_sessid || !jsession_value || !orderLink) {
    const missingFields = [];
    if (!hcservices_sessid) missingFields.push("hcservices_sessid");
    if (!jsession_value) missingFields.push("jsession_value");
    if (!orderLink) missingFields.push("orderLink");

    return res.status(400).json({
      error: `Missing required parameters: ${missingFields.join(", ")}`,
    });
  }

  try {
    const result = await fetchHighCourtOrderPdf({
      hcservices_sessid,
      jsession_value,
      orderLink,
    });

    if (!result.ok) {
      return res.status(502).json({
        error: "Failed to fetch HC order PDF",
        details: "HC portal returned a non-PDF response",
        contentType: result.contentType,
        preview: result.preview,
        cookies: result.cookies,
        sessionID: result.sessionID,
      });
    }

    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Length", result.data.length.toString());
    res.setHeader(
      "Content-Disposition",
      'inline; filename="hc-order.pdf"',
    );
    return res.send(result.data);
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/case/orders/highcourt/pdf: ${error.message}`,
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

    return res.status(500).json({
      error: "Failed to fetch HC order PDF",
      details: error.message,
    });
  }
}

module.exports = {
  getHighCourtCaseDetails,
  getHighCourtOrderPdf,
};
