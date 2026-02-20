//@ts-check
import fetch from "node-fetch";
import { validateInputJson } from "./support/JsonValidate.mjs";
import { verifyCaptcha } from "./support/recaptcha.mjs";
import { airTableApiUrl, postToAirTable } from "./support/airTable.mjs";
import { getServerConfigByHost } from "./support/serverList.mjs";

/**
 * @typedef {{name: string, value: string}[]} FormData
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
    body: ""
  };

  /**
   * Marks the response as an error with the given type, message, and status code.
   * @param {string} type
   * @param {string | {}} message
   * @param {number} [ResponseStatus]
   */
  const errorResponse = (type, message, ResponseStatus = 500) => {
    res.body = JSON.stringify({
      error: {
        type,
        message
      }
    });

    res.headers["Content-Type"] = "application/json";
    res.status = ResponseStatus;
    console.warn(`Error Response - ${type}:`, message);
    return res;
  };

  try {
    const serverConfig = getServerConfigByHost(req.headers.get("host") || ""); // Validate host and get server config, will throw if invalid

    const contentType =
      req.headers.get("content-type")?.trim().toLowerCase() || "";

    //PersonalAccessToken is a secret and should be kept in a key vault
    const PersonalAccessToken =
      process.env[serverConfig.airTablePersonalAccessTokenKeyName];
    if (!PersonalAccessToken) {
      return errorResponse(
        "Server Configuration Error",
        `'${serverConfig.airTablePersonalAccessTokenKeyName}' is not set in environment variables`
      );
    }

    //ReCaptchaSecret is a secret and should be kept in a key vault
    const recaptchaSecret = process.env[serverConfig.reCaptchaSecretKeyName];
    if (!recaptchaSecret) {
      return errorResponse(
        "Server Configuration Error",
        `'${serverConfig.reCaptchaSecretKeyName}' is not set in environment variables`
      );
    }

    if (req.method === "POST" && contentType.includes("application/json")) {
      // Valid POST with Json content

      const requestBody = /** @type {Record<string, any>} */ (await req.json());

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
        //verify captcha
        const fetchResponse_captcha = await verifyCaptcha(
          recaptchaSecret,
          requestBody.captcha["g-recaptcha-response"]
        );

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
            /** @type {FormData} */
            const formData = requestBody.formData;

            /** @type {{ [key: string]: string | number }} */
            const fields = {};

            for (const item of formData) {
              const metaField = myTable.fields.find(f => f.name === item.name);
              if (metaField) {
                const isNumberfield = metaField.type === "number";

                fields[item.name] = isNumberfield
                  ? Number(item.value)
                  : item.value;
              } else {
                return errorResponse(
                  "Field Not Found",
                  `Field with name '${item.name}' not found in table '${myTable.name}'.`,
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

            const responseContentType =
              fetchResponse.headers.get("content-type");
            if (responseContentType)
              res.headers["Content-Type"] = responseContentType;

            res.status = fetchResponse.status;
            if (fetchResponse.ok) {
              res.body = await fetchResponse.text();
            } else {
              // @ts-ignore
              const jsonError = (await fetchResponse.json())["error"];

              return errorResponse(
                `Airtable Error - ${jsonError.type}`,
                jsonError.message,
                fetchResponse.status
              );
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
