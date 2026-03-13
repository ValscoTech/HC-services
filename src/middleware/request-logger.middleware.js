function redactSensitiveBody(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveBody);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const redacted = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      /cookie|session|captcha|token|authorization/i.test(key)
    ) {
      redacted[key] = "[REDACTED]";
      continue;
    }

    redacted[key] = redactSensitiveBody(nestedValue);
  }

  return redacted;
}

module.exports = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] --- Incoming API Request ---`);
  console.log(`[${timestamp}] Method: ${req.method}, Path: ${req.originalUrl}`);
  console.log(`[${timestamp}] Request Body:`, redactSensitiveBody(req.body));
  next();
};
