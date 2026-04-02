//@ts-check

/**
 * @typedef {object} HttpResponse
 * @property {Record<string, string>} headers - HTTP response headers.
 * @property {number} status - HTTP response status code.
 * @property {*} [body] - HTTP response body.
 */

const getHttpResponse = () => {
  /** @type {HttpResponse} */
  const httpResponse = {
    headers: {},
    status: 500
  };
  return httpResponse;
};

/**
 *
 * @param {HttpResponse} httpResponse
 * @param {import("@azure/functions").HttpRequest} httpRequest
 */
const setCorsHeaders = (httpResponse, httpRequest) => {
  if (httpRequest.headers.get("sec-fetch-mode") !== "cors") return; // Not a CORS request, no need to set CORS headers

  const origin = httpRequest.headers.get("origin") || "null";
  if (origin === "null") {
    return; // Don't set CORS headers for requests with null origin
  }

  httpResponse.headers["Access-Control-Allow-Origin"] = origin;
  httpResponse.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  httpResponse.headers["Access-Control-Allow-Headers"] = "Content-Type";
  console.log(`CORS headers set for origin: ${origin}`);
};

/**
 * Validates CORS request and throws an error if invalid.
 * @param {import("@azure/functions").HttpRequest} httpRequest
 * @param {import("./serverList.mjs").ServerConfig} serverConfig
 */
const validateCorsRequest = (httpRequest, serverConfig) => {
  if (httpRequest.headers.get("sec-fetch-mode") !== "cors") return; // Not a CORS request, no need to set CORS headers

  const origin = httpRequest.headers.get("origin") || "null";

  if (origin === "null") {
    throw new Error("400: CORS request missing Origin header");
  }

  if (!serverConfig.origins.includes(origin)) {
    throw new Error(
      `403: Origin '${origin}' not allowed for project '${serverConfig.project}'`
    );
  }
};

export { getHttpResponse, setCorsHeaders, validateCorsRequest };
