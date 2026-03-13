const express = require("express");
const { getCnrNumberSearch } = require("./cnr-number.controller");

const router = express.Router();

router.post("/search/cnr-number", getCnrNumberSearch);

module.exports = router;
