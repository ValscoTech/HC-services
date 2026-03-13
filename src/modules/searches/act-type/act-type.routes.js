const express = require("express");
const { getActTypeSearch } = require("./act-type.controller");

const router = express.Router();

router.post("/search/act-type", getActTypeSearch);

module.exports = router;
