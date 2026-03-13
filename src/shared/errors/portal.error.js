const DEFAULT_PORTAL_ERROR_MESSAGE = "Error in the HC service portal";
const DEFAULT_NO_CASE_DETAILS_MESSAGE =
  "No case details found in the HC service portal";

class PortalLookupError extends Error {
  constructor(
    message = DEFAULT_PORTAL_ERROR_MESSAGE,
    {
      code = "HC_PORTAL_CASE_NOT_FOUND",
      statusCode = 404,
      raw = null,
      cause = null,
    } = {},
  ) {
    super(message);
    this.name = "PortalLookupError";
    this.code = code;
    this.statusCode = statusCode;
    this.raw = raw;
    this.cause = cause;
  }
}

function createPortalLookupError(message, options) {
  return new PortalLookupError(message, options);
}

function isPortalLookupError(error) {
  return error instanceof PortalLookupError;
}

module.exports = {
  DEFAULT_PORTAL_ERROR_MESSAGE,
  DEFAULT_NO_CASE_DETAILS_MESSAGE,
  PortalLookupError,
  createPortalLookupError,
  isPortalLookupError,
};
