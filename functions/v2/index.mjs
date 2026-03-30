//@ts-check
import fetch from "node-fetch";
import { verifyCaptcha } from "./support/recaptcha.mjs";
import {
  airTableApiUrl,
  postToAirTable,
  airTableProcessError,
  getRequestInit
} from "./support/airTable.mjs";
import { getServerConfigByHost } from "./support/serverList.mjs";
import { validateInputJson } from "./support/JsonValidate.mjs";
const captchaKey = "g-recaptcha-response";
const redirectSuccessKey = "redirect_success";
const redirectErrorKey = "redirect_error";

/**
 *
 * Azure Function HTTP trigger for processing form submissions.
 *
 * Handles GET and POST requests. Only POST requests with 'application/json' content type are processed.
 * Validates input, verifies reCAPTCHA, and posts form data to Airtable.
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

  /** @type {string?} */
  let redirectErrorUrl = null;

  try {
    console.log("Received request with method:", httpRequest.method);

    if (httpRequest.method === "POST") {
      // Valid POST with Json content
      const origin = httpRequest.headers.get("origin") || "";

      const serverConfig = getServerConfigByHost(origin); // Validate host and get server config, will throw if invalid
      const PersonalAccessToken = serverConfig.airtableToken;

      console.log("Parsed server config successfully. Origin:", origin);

      const contentType = httpRequest.headers.get("content-type") || "";

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

      //verify captcha
      const fetchResponse_captcha = await verifyCaptcha(
        serverConfig.recaptchaSecret,
        captchaResponse
      );

      if (fetchResponse_captcha.success) {
        // captcha is good, post to database

        /**
         * @param {import("node-fetch").Response} fetchResponse
         */
        const airTableProcessResponse = async fetchResponse => {
          if (fetchResponse.ok) {
            return await fetchResponse.json();
          } else {
            // Airtable API error
            const error = await airTableProcessError(fetchResponse);

            throw new Error(
              `${fetchResponse.status}: Airtable API Error - ${error.error.type}: ${error.error.message}`
            );
          }
        };

        // Get table info from airtable API
        const infoRequest = getRequestInit(PersonalAccessToken);

        console.log(
          "Fetching Airtable base and table information for Base ID:",
          serverConfig.airtableBaseId
        );

        const result = await fetch(
          `${airTableApiUrl}/meta/bases/${serverConfig.airtableBaseId}/tables`,
          infoRequest
        );

        console.log("Airtable response status:", result.status);

        if (!result.ok)
          throw new Error(
            `Base ID '${serverConfig.airtableBaseId}' not found. Is schema.bases:read present in the token's scopes?`
          );

        const tablesInfo =
          /** @type {import("./support/airTable.mjs").TablesInfo} */ (
            await airTableProcessResponse(result)
          );

        const myTable = tablesInfo.tables.find(
          table =>
            table.id === serverConfig.airtableTable ||
            table.name === serverConfig.airtableTable
        );
        if (!myTable)
          throw new Error(
            `Table with ID or Name '${serverConfig.airtableTable}' not found in base '${serverConfig.airtableBaseId}'`
          );

        const convertFormDataToFields = () => {
          /** @type {{ [key: string]: string | number }} */
          const fields = {};

          for (const key of Object.keys(formData)) {
            const metaField = myTable.fields.find(f => f.name === key);
            if (metaField) {
              const isNumberfield = metaField.type === "number";

              fields[key] = isNumberfield
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
            PersonalAccessToken,
            serverConfig.airtableBaseId,
            serverConfig.airtableTable,
            fields
          );

          if (fetchResponse.ok) {
            if (redirectSuccessUrl) {
              httpResponse.status = 302; // Redirect
              httpResponse.headers["Location"] = redirectSuccessUrl;
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
    } else {
      // NOT POST
      //res.set("X-Robots-Tag", "noindex"); //For preventing search indexing
      console.log("redirect to Root");
      // Redirect to root as HTTP - GET.
      httpResponse.status = 302;
      httpResponse.headers = { location: "/" };
    }
  } catch (/** @type {*} **/ e) {
    // ERROR
    const errorPayload = e.name !== "Error" ? e.name : `${e.message}`;

    console.error(`Error processing request:`, errorPayload);

    if (redirectErrorUrl) {
      httpResponse.status = 302; // Redirect
      httpResponse.headers["Location"] =
        redirectErrorUrl + encodeURIComponent(errorPayload);
    } else {
      httpResponse.body = errorPayload;
      httpResponse.status = 422; // Unprocessable Entity, since the error is likely due to bad input or failed captcha, not a server error
    }
  }

  return httpResponse;
}
