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
 * @param {import("./serverList.mjs").ServerConfig} serverConfig
 */
const setCorsHeaders = (httpResponse, httpRequest, serverConfig) => {
  // Validate origin
  const origin = httpRequest.headers.get("origin") || "";
  if (!serverConfig.origins.includes(origin)) {
    throw new Error(
      `403: Origin '${origin}' not allowed for project '${serverConfig.project}'`
    );
  }
  httpResponse.headers["Access-Control-Allow-Origin"] = origin;
  httpResponse.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  httpResponse.headers["Access-Control-Allow-Headers"] = "Content-Type";
};

export { getHttpResponse, setCorsHeaders };
