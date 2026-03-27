const { fetchCnrNumberSearch } = require("./cnr-number.service");

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

async function getCnrNumberSearch(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling CNR Number Search request.`);

  const {
    cino,
    captcha,
    caseStatusSearchType: rawCaseStatusSearchType = "CNRNumber",
    appFlag = "web",
    cookies: frontendCookiesObject,
  } = req.body;

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (!cino || !captcha || !cookieHeaderStringForExternalRequest) {
    const missingFields = [];
    if (!cino) missingFields.push("cino");
    if (!captcha) missingFields.push("captcha");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  const normalizedCino = String(cino).trim().toUpperCase();
  const caseStatusSearchType =
    String(rawCaseStatusSearchType || "").trim() || "CNRNumber";

  if (caseStatusSearchType !== "CNRNumber") {
    return res.status(400).json({
      error: "Invalid caseStatusSearchType. CNR search requires CNRNumber.",
    });
  }

  if (!/^[A-Z0-9]{16}$/.test(normalizedCino)) {
    return res.status(400).json({
      error:
        "Invalid CNR number. It must be exactly 16 alphanumeric characters.",
    });
  }

  if (normalizedCino === "0000000000000000") {
    return res.status(400).json({
      error: "Invalid CNR number. Enter a valid non-zero CNR number.",
    });
  }

  try {
    const result = await fetchCnrNumberSearch({
      cino: normalizedCino,
      captcha,
      caseStatusSearchType,
      appFlag,
      frontendCookiesObject,
    });

    const responseHcservicesSessid =
      result.cookies?.HCSERVICES_SESSID ||
      frontendCookiesObject?.HCSERVICES_SESSID ||
      null;
    const responseJsessionValue =
      result.cookies?.JSESSION ||
      result.cookies?.JSESSIONID ||
      frontendCookiesObject?.JSESSION ||
      frontendCookiesObject?.JSESSIONID ||
      null;
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
      data: result.data
        ? {
            ...result.data,
            orders: ordersWithProxyUrl,
          }
        : result.data,
    });
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(
      `[${errorTimestamp}] FATAL ERROR in /api/search/cnr-number: ${error.message}`,
    );

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
      error: "Failed to fetch CNR number search result",
      details: error.message,
      code: error.code,
    });
  }
}

module.exports = {
  getCnrNumberSearch,
};
