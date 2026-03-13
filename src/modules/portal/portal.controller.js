const {
  fetchHighCourtBenches,
  fetchHighCourtCaptcha,
  fetchCaseTypes,
} = require("./portal.service");
const { isPortalLookupError } = require("../../shared/errors/portal.error");

async function getHighCourtBenches(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling High Court Benches request.`);

  const { state_code, appFlag = "web" } = req.body;

  if (!state_code) {
    return res.status(400).json({
      error: "Missing required parameters: state_code",
    });
  }

  try {
    const result = await fetchHighCourtBenches({ state_code, appFlag });
    console.log(`[${timestamp}] Parsed benches:`, result.benches);
    res.json({ benches: result.benches });
  } catch (error) {
    console.error(
      `[${timestamp}] ERROR in /api/benches/highcourt: ${error.message}`,
    );
    if (isPortalLookupError(error) || error.statusCode) {
      return res.status(error.statusCode || 404).json({
        error: error.message,
        code: error.code,
      });
    }
    if (error.response) {
      console.error(
        `[${timestamp}] Error Response Status: ${error.response.status}`,
      );
      console.error(
        `[${timestamp}] Error Response Data Preview: ${String(
          error.response.data,
        ).substring(0, 500)}...`,
      );
      console.error(
        `[${timestamp}] Error Response Headers:`,
        error.response.headers,
      );
    } else if (error.request) {
      console.error(`[${timestamp}] No response received from target server.`);
    }
    res
      .status(500)
      .json({ error: "Failed to fetch benches", details: error.message });
  } finally {
    console.log(
      `[${timestamp}] --- /api/benches/highcourt request finished ---`,
    );
  }
}

async function getHighCourtCaptcha(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling High Court Captcha request.`);

  try {
    const result = await fetchHighCourtCaptcha();

    console.log(
      `[${timestamp}] Captcha response cookies (parsed):`,
      "[REDACTED]",
    );
    console.log(
      `[${timestamp}] Captcha response session ID: [REDACTED]`,
    );

    res.json({
      captchaImageBase64: result.captchaImageBase64,
      cookies: result.cookies,
      sessionId: result.sessionId,
    });

    console.log(`[${timestamp}] Captcha response sent to frontend.`);
  } catch (error) {
    console.error(
      `[${timestamp}] ERROR in /api/captcha/highcourt: ${error.message}`,
    );
    if (error.code === "ECONNRESET") {
      console.error(
        `[${timestamp}] Connection reset by peer (socket hang up).`,
      );
    } else if (error.response) {
      console.error(
        `[${timestamp}] Error Response Status: ${error.response.status}`,
      );
      console.error(
        `[${timestamp}] Error Response Data Preview: ${String(
          error.response.data,
        ).substring(0, 500)}...`,
      );
      console.error(
        `[${timestamp}] Error Response Headers:`,
        error.response.headers,
      );
    } else if (error.request) {
      console.error(
        `[${timestamp}] No response received from target server during captcha fetch.`,
      );
    }
    res
      .status(500)
      .json({ error: "Failed to fetch captcha", details: error.message });
  } finally {
    console.log(
      `[${timestamp}] --- /api/captcha/highcourt request finished ---`,
    );
  }
}

async function getCaseTypes(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling Fetch Case Types request.`);

  const { court_code, state_code, cookies: frontendCookiesObject } = req.body;

  console.log(`[${timestamp}] Received parameters:`);
  console.log(`  - Court Code: ${court_code}`);
  console.log(`  - State Code: ${state_code}`);
  console.log(`  - Cookies Object from Frontend:`, "[REDACTED]");

  const cookieHeaderStringForExternalRequest = Object.entries(
    frontendCookiesObject || {},
  )
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  if (!court_code || !state_code || !cookieHeaderStringForExternalRequest) {
    const missingFields = [];
    if (!court_code) missingFields.push("court_code");
    if (!state_code) missingFields.push("state_code");
    if (!cookieHeaderStringForExternalRequest) missingFields.push("cookies");

    console.error(
      `[${timestamp}] ERROR: Missing required fields: ${missingFields.join(", ")}`,
    );
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  try {
    const result = await fetchCaseTypes({
      court_code,
      state_code,
      frontendCookiesObject,
    });

    console.log(`[${timestamp}] Parsed case types:`, result.caseTypes);
    res.json({
      caseTypes: result.caseTypes,
      cookies: result.cookies,
      sessionID: result.sessionID,
    });
  } catch (error) {
    console.error(`[${timestamp}] ERROR in /api/case/types: ${error.message}`);
    if (isPortalLookupError(error) || error.statusCode) {
      return res.status(error.statusCode || 404).json({
        error: error.message,
        code: error.code,
      });
    }
    if (error.response) {
      console.error(
        `[${timestamp}] Error Response Status: ${error.response.status}`,
      );
      console.error(
        `[${timestamp}] Error Response Data Preview: ${String(
          error.response.data,
        ).substring(0, 500)}...`,
      );
      console.error(
        `[${timestamp}] Error Response Headers:`,
        error.response.headers,
      );
    } else if (error.request) {
      console.error(`[${timestamp}] No response received from target server.`);
    }
    res
      .status(500)
      .json({ error: "Failed to fetch case types", details: error.message });
  } finally {
    console.log(`[${timestamp}] --- /api/case/types request finished ---`);
  }
}

module.exports = {
  getHighCourtBenches,
  getHighCourtCaptcha,
  getCaseTypes,
};
