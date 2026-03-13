const express = require("express");
const { getAdvocateNameSearch } = require("./advocate-name.controller");

const router = express.Router();

router.post("/search/advocate-name", getAdvocateNameSearch);

module.exports = router;
