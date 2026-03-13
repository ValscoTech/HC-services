const express = require("express");
const { getFIRNumberSearch } = require("./fir-number.controller");

const router = express.Router();

router.post("/search/fir-number", getFIRNumberSearch);

module.exports = router;
