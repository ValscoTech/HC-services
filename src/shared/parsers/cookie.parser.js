function parseSetCookieHeaders(setCookieHeaders) {
  const cookies = {};
  let jsessionHcservicesValue = null;
  let hcservicesSessidValue = null;

  if (setCookieHeaders && Array.isArray(setCookieHeaders)) {
    setCookieHeaders.forEach((cookieString) => {
      const parts = cookieString.split(";")[0].split("=");
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join("=").trim();

        const pathMatch = cookieString.match(/Path=([^;]+)/i);
        const cookiePath = pathMatch ? pathMatch[1].trim() : "/";

        if (name === "JSESSIONID" || name === "JSESSION") {
          if (cookiePath === "/hcservices" || cookiePath === "/") {
            jsessionHcservicesValue = value;
          }
          cookies[name] = value;
        } else if (name === "HCSERVICES_SESSID") {
          hcservicesSessidValue = value;
          cookies[name] = value;
        } else {
          cookies[name] = value;
        }
      }
    });
  }

  if (hcservicesSessidValue) {
    cookies["HCSERVICES_SESSID"] = hcservicesSessidValue;
  }
  if (jsessionHcservicesValue) {
    cookies["JSESSION"] = jsessionHcservicesValue;
    cookies["JSESSIONID"] = jsessionHcservicesValue;
  }

  return cookies;
}

function getSessionIdFromCookies(cookies) {
  if (cookies && typeof cookies === "object") {
    if (cookies["JSESSIONID"]) return cookies["JSESSIONID"];
    if (cookies["JSESSION"]) return cookies["JSESSION"];
    if (cookies["HCSERVICES_SESSID"]) return cookies["HCSERVICES_SESSID"];
  }
  return null;
}

module.exports = {
  parseSetCookieHeaders,
  getSessionIdFromCookies,
};
