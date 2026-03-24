//@ts-check
import fetch from "node-fetch";
import { validateInputJson } from "./support/JsonValidate.mjs";
import { verifyCaptcha } from "./support/recaptcha.mjs";
import {
  airTableApiUrl,
  postToAirTable,
  airTableProcessError,
  getRequestInit
} from "./support/airTable.mjs";
import { getServerConfigByHost } from "./support/serverList.mjs";
const captchaKey = "g-recaptcha-response";

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
    jsonBody: undefined
  };

  /**
   * Marks the response as an error with the given type, message, and status code.
   * @param {string} type
   * @param {string | {}} message
   * @param {number} [responseStatus]
   */
  const errorResponse = (type, message, responseStatus = 500) => {
    httpResponse.jsonBody = {
      error: {
        type,
        message
      }
    };

    httpResponse.headers["Content-Type"] = "application/json";
    httpResponse.status = responseStatus;
    console.warn(`Error Response - ${type}:`, message);
    return httpResponse;
  };

  try {
    const serverConfig = getServerConfigByHost(
      httpRequest.headers.get("host") || ""
    ); // Validate host and get server config, will throw if invalid

    const contentType =
      httpRequest.headers.get("content-type")?.trim().toLowerCase() || "";

    const PersonalAccessToken = serverConfig.airtableToken;

    if (
      httpRequest.method === "POST" &&
      contentType.includes("application/json")
    ) {
      // Valid POST with Json content

      const requestBody = /** @type {[string, string][]} */ (
        await httpRequest.json()
      );

      // Validate input
      const validationErrors = validateInputJson(requestBody);
      if (validationErrors) {
        // Failed validation
        return errorResponse(
          "JSON validation failed",
          validationErrors,
          422 // Unprocessable Entity
        );
      } else {
        /** @type {{ [key: string]: string }} */
        const requestNameValues = Object.fromEntries(requestBody);

        //verify captcha
        const fetchResponse_captcha = await verifyCaptcha(
          serverConfig.recaptchaSecret,
          requestNameValues[captchaKey]
        );

        delete requestNameValues[captchaKey]; // No need to keep this around

        if (fetchResponse_captcha.success) {
          // captcha is good, post to database

          /**
           * @param {import("node-fetch").Response} fetchResponse
           */
          const airTableProcessResponse = async fetchResponse => {
            const responseContentType =
              fetchResponse.headers.get("content-type");
            if (responseContentType)
              httpResponse.headers["Content-Type"] = responseContentType;

            if (fetchResponse.ok) {
              return await fetchResponse.json();
            } else {
              // Airtable API error
              const error = await airTableProcessError(fetchResponse);

              return errorResponse(
                `Airtable Error - ${error.error.type}`,
                error.error.message,
                fetchResponse.status
              );
            }
          };

          // Get table info from airtable API
          const infoRequest = getRequestInit(PersonalAccessToken);

          const result = await fetch(
            `${airTableApiUrl}/meta/bases/${serverConfig.airtableBaseId}/tables`,
            infoRequest
          );

          if (!result.ok) {
            return errorResponse(
              "Base Not Found",
              `Base ID '${serverConfig.airtableBaseId}' not found.`,
              422 // Unprocessable Entity
            );
          }

          const tablesInfo =
            /** @type {import("./support/airTable.mjs").TablesInfo} */ (
              await airTableProcessResponse(result)
            );

          const myTable = tablesInfo.tables.find(
            table =>
              table.id === serverConfig.airtableTable ||
              table.name === serverConfig.airtableTable
          );
          if (!myTable) {
            return errorResponse(
              "Table Not Found",
              `Table with ID or Name '${serverConfig.airtableTable}' not found in base '${serverConfig.airtableBaseId}'`,
              422 // Unprocessable Entity
            );
          }

          const convertFormDataToFields = () => {
            const formData = requestNameValues;

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
                return errorResponse(
                  "Field Not Found",
                  `Field with name '${key}' not found in table '${myTable.name}'.`,
                  422 // Unprocessable Entity
                );
              }
            }
            return fields;
          };

          const fields = convertFormDataToFields();
          if (fields) {
            const fetchResponse = await postToAirTable(
              PersonalAccessToken,
              serverConfig.airtableBaseId,
              serverConfig.airtableTable,
              fields
            );

            if (fetchResponse.ok) {
              httpResponse.status = 204; // No Content
            } else {
              // Airtable API error
              const error = await airTableProcessError(fetchResponse);

              const responseContentType =
                fetchResponse.headers.get("content-type");
              if (responseContentType)
                httpResponse.headers["Content-Type"] = responseContentType;

              httpResponse.status = fetchResponse.status;
              httpResponse.jsonBody = error;
            }
          }
        } else {
          // Failed captcha
          return errorResponse(
            "Captcha failed",
            `Failed human detection. Error Codes ${JSON.stringify(fetchResponse_captcha["error-codes"])}`,
            422 // Unprocessable Entity
          );
        }
      }
    } else {
      // NOT POST
      //res.set("X-Robots-Tag", "noindex"); //For preventing search indexing

      // Redirect to root as HTTP - GET.
      httpResponse.status = 302;
      httpResponse.headers = { location: "/" };
    }
  } catch (/** @type {*} **/ e) {
    // ERROR

    return errorResponse(e.name, e.message);
  }

  return httpResponse;
}
