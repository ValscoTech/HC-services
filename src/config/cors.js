const cors = require("cors");
const { allowedOrigins } = require("./env");

module.exports = cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "X-Requested-With",
    "Accept",
    "Cookie",
  ],
});
