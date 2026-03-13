const express = require("express");
const { getPartyNameSearch } = require("./party-name.controller");

const router = express.Router();

router.post("/search/party-name", getPartyNameSearch);

module.exports = router;
