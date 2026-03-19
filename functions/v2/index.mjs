//@ts-check
import fetch from "node-fetch";
import { validateInputJson } from "./support/JsonValidate.mjs";
import { verifyCaptcha } from "./support/recaptcha.mjs";
import { airTableApiUrl, postToAirTable } from "./support/airTable.mjs";
import { getServerConfigByHost } from "./support/serverList.mjs";
const captchaKey = "g-recaptcha-response";

/**
 * @typedef {import("./support/airTable.mjs").TablesInfo} TablesInfo
 *
 * Azure Function HTTP trigger for processing form submissions.
 *
 * Handles GET and POST requests. Only POST requests with 'application/json' content type are processed.
 * Validates input, verifies reCAPTCHA, and posts form data to Airtable.
 *
 * Environment Variables:
 * - AirTablePersonalAccessToken: Airtable API access token (required)
 * - ReCaptchaSecret: reCAPTCHA secret key (required)
 * @param {import("@azure/functions").HttpRequest} req - HTTP request object.
 * @param {import("@azure/functions").InvocationContext} context - Azure Function context object.
 * @throws {Error} If required environment variables are missing or if table/field validation fails.
 */
export default async function (req, context) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const res = {
    /** @type {Record<string, string>} */
    headers: {},
    status: 200,
    /** @type {*} */
    jsonBody: undefined
  };

  /**
   * Marks the response as an error with the given type, message, and status code.
   * @param {string} type
   * @param {string | {}} message
   * @param {number} [ResponseStatus]
   */
  const errorResponse = (type, message, ResponseStatus = 500) => {
    res.jsonBody = {
      error: {
        type,
        message
      }
    };

    res.headers["Content-Type"] = "application/json";
    res.status = ResponseStatus;
    console.warn(`Error Response - ${type}:`, message);
    return res;
  };

  try {
    const serverConfig = getServerConfigByHost(req.headers.get("host") || ""); // Validate host and get server config, will throw if invalid

    const contentType =
      req.headers.get("content-type")?.trim().toLowerCase() || "";

    const PersonalAccessToken = serverConfig.airTablePersonalAccessTokenKey;

    if (req.method === "POST" && contentType.includes("application/json")) {
      // Valid POST with Json content

      const requestBody = /** @type {[string, string][]} */ (await req.json());

      // Validate input
      const validationErrors = validateInputJson(requestBody);
      if (validationErrors) {
        // Failed validation
        return errorResponse(
          "validation failed",
          validationErrors,
          422 // Unprocessable Entity
        );
      } else {
        /** @type {{ [key: string]: string }} */
        const requestNameValues = Object.fromEntries(requestBody);

        //verify captcha
        const fetchResponse_captcha = await verifyCaptcha(
          serverConfig.reCaptchaSecretKey,
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
              res.headers["Content-Type"] = responseContentType;

            /** @type {*} */
            const json = await fetchResponse.json();

            if (json.error) {
              return errorResponse(
                `Airtable Error - ${json.error.type}`,
                json.error.message,
                fetchResponse.status
              );
            }
            return json;
          };

          // Get table info from airtable API
          /** @type { import("node-fetch").RequestInit } */
          const infoRequest = {
            method: "GET",
            headers: {
              Authorization: `Bearer ${PersonalAccessToken}`
            }
          };

          const result = await fetch(
            `${airTableApiUrl}/meta/bases/${serverConfig.airTableBaseId}/tables`,
            infoRequest
          );

          const tablesInfo = /** @type {TablesInfo} */ (
            await airTableProcessResponse(result)
          );
          if (!tablesInfo.tables) {
            return tablesInfo; // Actually an error response
          }

          const myTable = tablesInfo.tables.find(
            table =>
              table.id === serverConfig.airTableTableIdOrName ||
              table.name === serverConfig.airTableTableIdOrName
          );
          if (!myTable) {
            return errorResponse(
              "Table Not Found",
              `Table with ID or Name '${serverConfig.airTableTableIdOrName}' not found in base '${serverConfig.airTableBaseId}'`,
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
              serverConfig.airTableBaseId,
              serverConfig.airTableTableIdOrName,
              fields
            );

            if (fetchResponse.ok) {
              res.status = 204; // No Content
            } else {
              // Airtable API error
              const responseContentType =
                fetchResponse.headers.get("content-type");
              if (responseContentType)
                res.headers["Content-Type"] = responseContentType;

              res.status = fetchResponse.status;
              res.jsonBody = await fetchResponse.json();
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
      res.status = 302;
      res.headers = { location: "/" };
    }
  } catch (e) {
    // ERROR
    //@ts-ignore
    return errorResponse(e.name, e.message);
  }

  return res;
}
