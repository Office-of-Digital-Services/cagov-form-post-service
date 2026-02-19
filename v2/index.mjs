//@ts-check
import fetch from "node-fetch";
import { validateInputJson } from "./support/JsonValidate.mjs";
import { verifyCaptcha } from "./support/recaptcha.mjs";
import { airTableApiUrl, postToAirTable } from "./support/airTable.mjs";

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appXfKtM85FrT0Ipc"; //Enter your Airtable base ID
const airTableTableIdOrName = "tblrWC8qRNId3mSaL"; //Enter your Airtable table ID

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
 * @param {import("@azure/functions").Context} context - Azure Function context object.
 * @param {import("@azure/functions").HttpRequest} req - HTTP request object.
 * @throws {Error} If required environment variables are missing or if table/field validation fails.
 */
export default async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const res = /** @type { import("@azure/functions").HttpResponseFull} */ (
    context.res
  );

  /**
   * Marks the response as an error with the given type, message, and status code.
   * @param {string} type
   * @param {string | {}} message
   * @param {number} [status]
   */
  const errorResponse = (type, message, status = 500) => {
    res.body = {
      error: {
        type,
        message
      }
    };
    res.type("application/json");
    res.status(status);
    console.warn(`Error Response - ${type}:`, message);
  };

  try {
    const contentType = req.headers["content-type"]?.trim().toLowerCase();

    //PersonalAccessToken is a secret and should be kept in a key vault
    const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
    if (!PersonalAccessToken) {
      errorResponse(
        "Server Configuration Error",
        "'AirTablePersonalAccessToken' is not set in environment variables"
      );
      return;
    }

    //ReCaptchaSecret is a secret and should be kept in a key vault
    const recaptchaSecret = process.env["ReCaptchaSecret"];
    if (!recaptchaSecret) {
      errorResponse(
        "Server Configuration Error",
        "'ReCaptchaSecret' is not set in environment variables"
      );
      return;
    }

    if (req.method === "POST" && contentType.includes("application/json")) {
      // Valid POST with Json content

      // Validate input
      const validationErrors = validateInputJson(req.body);
      if (validationErrors) {
        // Failed validation
        errorResponse(
          "validation failed",
          validationErrors,
          422 // Unprocessable Entity
        );
      } else {
        //verify captcha
        const fetchResponse_captcha = await verifyCaptcha(
          recaptchaSecret,
          req.body.captcha["g-recaptcha-response"]
        );

        if (fetchResponse_captcha.success) {
          // captcha is good, post to database

          /**
           * @param {import("node-fetch").Response} fetchResponse
           */
          const airTableProcessResponse = async fetchResponse => {
            const responseContentType =
              fetchResponse.headers.get("content-type");
            if (responseContentType) res.type(responseContentType);

            /** @type {*} */
            const json = await fetchResponse.json();

            if (json.error) {
              errorResponse(
                `Airtable Error - ${json.error.type}`,
                json.error.message,
                fetchResponse.status
              );

              return;
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
            `${airTableApiUrl}/meta/bases/${airTableBaseId}/tables`,
            infoRequest
          );

          const tablesInfo = /** @type {TablesInfo} */ (
            await airTableProcessResponse(result)
          );
          if (!tablesInfo) {
            return; // airTableProcessResponse already handled the error response
          }

          const myTable = tablesInfo.tables.find(
            table =>
              table.id === airTableTableIdOrName ||
              table.name === airTableTableIdOrName
          );
          if (!myTable) {
            errorResponse(
              "Table Not Found",
              `Table with ID or Name '${airTableTableIdOrName}' not found in base '${airTableBaseId}'`,
              422 // Unprocessable Entity
            );

            return;
          }

          const convertFormDataToFields = () => {
            /** @type {FormData} */
            const formData = req.body.formData;

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
                errorResponse(
                  "Field Not Found",
                  `Field with name '${item.name}' not found in table '${myTable.name}'.`,
                  422 // Unprocessable Entity
                );

                return;
              }
            }
            return fields;
          };

          const fields = convertFormDataToFields();
          if (fields) {
            const fetchResponse = await postToAirTable(
              PersonalAccessToken,
              airTableBaseId,
              airTableTableIdOrName,
              fields
            );

            const responseContentType =
              fetchResponse.headers.get("content-type");
            if (responseContentType) res.type(responseContentType);

            res.status(fetchResponse.status);
            res.body = await fetchResponse.json();
            if (!fetchResponse.ok) {
              errorResponse(
                `Airtable POST failed - ${res.body.error.type}`,
                res.body.error.message,
                fetchResponse.status
              );
            }
          }
        } else {
          // Failed captcha
          errorResponse(
            "Captcha failed",
            `Failed human detection. Error Codes ${JSON.stringify(fetchResponse_captcha["error-codes"])}`,
            422 // Unprocessable Entity
          );
        }
      }
    } else {
      // NOT POST
      //res.set("X-Robots-Tag", "noindex"); //For preventing search indexing
      res.status(302);
      res.setHeader("location", "/");
      res.body = undefined;
    }
  } catch (e) {
    // ERROR
    //@ts-ignore
    errorResponse(e.name, e.message);
  }
}
