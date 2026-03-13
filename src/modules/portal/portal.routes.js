const express = require("express");
const {
  getHighCourtBenches,
  getHighCourtCaptcha,
  getCaseTypes,
} = require("./portal.controller");

const router = express.Router();

router.post("/benches/highcourt", getHighCourtBenches);
router.post("/captcha/highcourt", getHighCourtCaptcha);
router.post("/case/types", getCaseTypes);

module.exports = router;
