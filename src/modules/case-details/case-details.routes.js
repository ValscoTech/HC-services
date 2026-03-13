const express = require("express");
const { getHighCourtCaseDetails } = require("./case-details.controller");

const router = express.Router();

router.post("/case/details/highcourt", getHighCourtCaseDetails);

module.exports = router;
