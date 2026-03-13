const { fetchHighCourtCaseDetails } = require("./case-details.service");
const { isPortalLookupError } = require("../../shared/errors/portal.error");

async function getHighCourtCaseDetails(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Handling High Court Case Details request.`);

  const {
    hcservices_sessid,
    jsession_value,
    court_code,
    state_code,
    court_complex_code,
    case_no,
    cino,
    appFlag = "",
  } = req.body;

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

    res.json(result);
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

module.exports = {
  getHighCourtCaseDetails,
};
