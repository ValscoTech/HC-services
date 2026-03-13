const express = require("express");
const { getCaseTypeSearch } = require("./case-type.controller");

const router = express.Router();

router.post("/search/case-type", getCaseTypeSearch);

module.exports = router;
