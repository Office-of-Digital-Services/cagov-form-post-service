//@ts-check
import { getServerConfig } from "./support/serverList.mjs";

/**
 * Azure Function HTTP trigger for processing form submissions.
 * Handles GET requests.
 *
 * Environment Variables:
 * - AirTablePersonalAccessToken: Airtable API access token (required)
 * - ReCaptchaSecret: reCAPTCHA secret key (required)
 * @param {import("@azure/functions").HttpRequest} httpRequest - HTTP request object.
 * @param {import("@azure/functions").InvocationContext} context - Azure Function context object.
 */
export default async function (httpRequest, context) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const httpResponse = {
    /** @type {Record<string, string>} */
    headers: {},
    status: 500,
    /** @type {*} */
    body: undefined
  };

  try {
    console.log("Received request with method:", httpRequest.method);

    const serverConfig = getServerConfig(httpRequest.params.path); // Validate host and get server config, will throw if invalid
    console.log(
      "Parsed server config successfully. Project:",
      serverConfig.project
    );
  } catch (/** @type {*} */ e) {
    const message = e?.message || String(e);
    console.error(`Error processing request:`, message);

    httpResponse.body = message;
  }

  return httpResponse;
}
