const express = require("express");
const {
  getHighCourtCaseDetails,
  getHighCourtOrderPdf,
} = require("./case-details.controller");

const router = express.Router();

router.post("/case/details/highcourt", getHighCourtCaseDetails);
router.get("/case/orders/highcourt/pdf", getHighCourtOrderPdf);

module.exports = router;
