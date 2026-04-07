//@ts-check
import { getServerConfig } from "./support/serverList.mjs";
import {
  getHttpResponse,
  setCorsHeaders,
  validateCorsRequest
} from "./support/cors.mjs";
import { getTable } from "./support/airTable.mjs";

/**
 *
 * Azure Function HTTP trigger for processing form submissions.
 * Handles GET requests.
 * @param {import("@azure/functions").HttpRequest} httpRequest - HTTP request object.
 * @param {import("@azure/functions").InvocationContext} context - Azure Function context object.
 */
export default async function (httpRequest, context) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const httpResponse = getHttpResponse();

  try {
    console.log("Received request with method:", httpRequest.method);

    setCorsHeaders(httpResponse, httpRequest);

    const serverConfig = getServerConfig(httpRequest.params); // Validate host and get server config, will throw if invalid

    validateCorsRequest(httpRequest, serverConfig);

    const tableInfo = await getTable(
      serverConfig.airtableToken,
      serverConfig.airtableBaseId,
      serverConfig.airtableTableId
    );

    httpResponse.status = 200;
    httpResponse.body = `✅ Project "${serverConfig.project}" is properly connecting to table "${tableInfo.name}".`;
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
