const express = require("express");
const { refreshExportsController } = require("./export.controller");

const router = express.Router();

router.post("/refresh-exports", refreshExportsController);

module.exports = router;
