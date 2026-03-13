const express = require("express");
const { getFilingNumberSearch } = require("./filing-number.controller");

const router = express.Router();

router.post("/search/filing-number", getFilingNumberSearch);

module.exports = router;
