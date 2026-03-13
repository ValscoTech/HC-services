const https = require("https");

const agent = new https.Agent({ keepAlive: false });

module.exports = { agent };
