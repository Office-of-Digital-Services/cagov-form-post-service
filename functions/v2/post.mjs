//@ts-check
import { verifyCaptcha } from "./support/recaptcha.mjs";
import {
  postToAirTable,
  airTableProcessError,
  getTable
} from "./support/airTable.mjs";
import { getServerConfig } from "./support/serverList.mjs";
import { validateInputJson } from "./support/JsonValidate.mjs";
import {
  getHttpResponse,
  setCorsHeaders,
  validateCorsRequest
} from "./support/cors.mjs";

const captchaKey = "g-recaptcha-response";
const redirectSuccessKey = "redirect_success";
const redirectErrorKey = "redirect_error";

/**
 *
 * Azure Function HTTP trigger for processing form submissions.
 * Handles POST requests.
 * @param {import("@azure/functions").HttpRequest} httpRequest - HTTP request object.
 * @param {import("@azure/functions").InvocationContext} context - Azure Function context object.
 */
export default async function (httpRequest, context) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const httpResponse = getHttpResponse();

  /** @type {string?} */
  let redirectErrorUrl = null;

  /**
   *
   * @param {string} url
   */
  const originRedirect = url => {
    const origin = httpRequest.headers.get("origin");
    if (origin && origin !== "null" && url.startsWith("/")) {
      return origin + url;
    }
    return url;
  };

  try {
    console.log("Received request with method:", httpRequest.method);

    const serverConfig = getServerConfig(httpRequest.params); // Validate host and get server config, will throw if invalid
    console.log(
      "Parsed server config successfully. Project:",
      serverConfig.project
    );

    const contentType = httpRequest.headers.get("content-type") || "";

    setCorsHeaders(httpResponse, httpRequest);

    /** @type {[string, string][]} */
    let requestBody = [];

    if (contentType === "application/json") {
      // JSON POST
      requestBody = /** @type {[string, string][]} */ (
        await httpRequest.json()
      );

      // Validate input
      const validationErrors = validateInputJson(requestBody);
      if (validationErrors) {
        // Failed validation
        throw new Error(
          `400: JSON validation failed${JSON.stringify(validationErrors)}`
        );
      }
    } else {
      // Form POST
      const form = await httpRequest.formData();
      // Convert to a simple array of [name, value]
      requestBody = [...form.entries()].map(([name, value]) => [
        name,
        value.toString()
      ]);
    }

    /** @type {{ [key: string]: string }} */
    const formData = Object.fromEntries(requestBody);

    const captchaResponse = formData[captchaKey];
    const redirectSuccessUrl = formData[redirectSuccessKey];
    redirectErrorUrl = formData[redirectErrorKey];

    delete formData[redirectSuccessKey]; // No need to keep this around
    delete formData[redirectErrorKey]; // No need to keep this around
    delete formData[captchaKey]; // No need to keep this around

    validateCorsRequest(httpRequest, serverConfig);

    //verify captcha
    const fetchResponse_captcha = await verifyCaptcha(
      serverConfig.recaptchaSecret,
      captchaResponse
    );

    if (fetchResponse_captcha.success) {
      // captcha is good, post to database

      const myTable = await getTable(
        serverConfig.airtableToken,
        serverConfig.airtableBaseId,
        serverConfig.airtableTableId
      );

      //Table was found, set the Table ID in case the table name was used
      serverConfig.airtableTableId = myTable.id;

      const convertFormDataToFields = () => {
        /** @type {{ [key: string]: string | number }} */
        const fields = {};

        for (const key of Object.keys(formData)) {
          const metaField = myTable.fields.find(
            f => f.name.toLowerCase() === key.toLowerCase()
          );
          if (metaField) {
            const isNumberfield = metaField.type === "number";

            // Use the correct field case we found above
            fields[metaField.name] = isNumberfield
              ? Number(formData[key])
              : formData[key];
          } else {
            throw new Error(
              `Field with name '${key}' not found in table '${myTable.name}'.`
            );
          }
        }
        return fields;
      };

      console.log("Converting form data to Airtable fields format.");

      const fields = convertFormDataToFields();
      if (fields) {
        const fetchResponse = await postToAirTable(
          serverConfig.airtableToken,
          serverConfig.airtableBaseId,
          serverConfig.airtableTableId,
          fields
        );

        if (fetchResponse.ok) {
          if (redirectSuccessUrl) {
            httpResponse.status = 302; // Redirect
            httpResponse.headers["Location"] =
              originRedirect(redirectSuccessUrl);
          } else {
            // Fire and forget, just return 204
            httpResponse.status = 204; // No Content
          }
        } else {
          // Airtable API error
          const error = await airTableProcessError(fetchResponse);

          throw new Error(
            `${fetchResponse.status}: Airtable API Error - ${error.error.type}: ${error.error.message}`
          );
        }
      }
    } else {
      // Failed captcha
      throw new Error(
        `Captcha failed: Failed human detection. Error Codes ${JSON.stringify(fetchResponse_captcha["error-codes"])}`
      );
    }
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

    if (redirectErrorUrl) {
      httpResponse.status = 302;
      httpResponse.headers["Location"] =
        originRedirect(redirectErrorUrl) + encodeURIComponent(message);
    } else {
      httpResponse.status = status;
      httpResponse.body = message;
    }
  }

  return httpResponse;
}
