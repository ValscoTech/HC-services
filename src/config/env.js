require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  allowedOrigins: [
    "https://verdant-cucurucho-13134b.netlify.app",
    "https://jr-portal.vercel.app",
    "http://localhost:3000",
    "https://www.jurident.com",
    "https://jhc.jurident.com",
  ],
  benchesSession: {
    hcservicesSessid:
      process.env.HCSERVICES_SESSID || "PUT_YOUR_FRESH_HCSERVICES_SESSID_HERE",
    jsession: process.env.JSESSION_BENCHES || "PUT_YOUR_FRESH_JSESSION_HERE",
  },
};
