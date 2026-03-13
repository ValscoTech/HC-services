const express = require("express");
const { getCaseNumberSearch } = require("./case-number.controller");

const router = express.Router();

router.post("/search/case-number", getCaseNumberSearch);

module.exports = router;
