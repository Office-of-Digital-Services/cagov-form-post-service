//@ts-check
import { getHttpResponse, setCorsHeaders } from "./support/cors.mjs";
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

  const httpResponse = getHttpResponse();

  try {
    const serverConfig = getServerConfig(httpRequest.params.path);

    setCorsHeaders(httpResponse, httpRequest, serverConfig);

    httpResponse.status = 204;
  } catch (/** @type {*} */ e) {
    // Normalize the error message
    const rawMessage = e?.message || String(e);
    let status = 422; // default for validation/captcha/user errors
    let message = rawMessage;

    // Detect "###: message" pattern
    const match = rawMessage.match(/^(\d{3}):\s*(.*)$/);
    if (match) {
      status = Number(match[1]);
      message = match[2];
    }

    console.error(`Error processing request:`, message);

    httpResponse.status = status;
    httpResponse.body = message;
  }

  return httpResponse;
}
