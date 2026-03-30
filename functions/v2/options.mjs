//@ts-check
import { getServerConfig } from "./support/serverList.mjs";

/**
 *
 * Azure Function HTTP trigger for processing form submissions.
 * Handles OPTIONS requests.
 * @param {import("@azure/functions").HttpRequest} httpRequest - HTTP request object.
 * @param {import("@azure/functions").InvocationContext} context - Azure Function context object.
 */
export default async function (httpRequest, context) {
  context.log("OPTIONS preflight received");

  const httpResponse = {
    /** @type {Record<string, string>} */
    headers: {},
    status: 204,
    /** @type {*} */
    body: undefined
  };

  try {
    const origin = httpRequest.headers.get("origin") || "";
    const serverConfig = getServerConfig(httpRequest.params.path);

    // Check if origin is allowed
    if (!serverConfig.origins.includes(origin)) {
      httpResponse.status = 403;
      httpResponse.body = `403: Origin '${origin}' not allowed`;
      return httpResponse;
    }

    // Echo back the allowed origin
    httpResponse.headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600"
    };

    httpResponse.status = 204;
  } catch (/** @type {*} */ e) {
    const message = e?.message || String(e);
    console.error("OPTIONS error:", message);

    httpResponse.status = 500;
    httpResponse.body = message;
  }

  return httpResponse;
}
