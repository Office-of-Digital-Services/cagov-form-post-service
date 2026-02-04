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

  //PersonalAccessToken is a secret and should be kept in a key vault
  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  if (!PersonalAccessToken) {
    throw new Error(
      "AirTablePersonalAccessToken is not set in environment variables"
    );
  }

  //ReCaptchaSecret is a secret and should be kept in a key vault
  const recaptchaSecret = process.env["ReCaptchaSecret"];
  if (!recaptchaSecret) {
    throw new Error("ReCaptchaSecret is not set in environment variables");
  }

  const contentType = req.headers["content-type"]?.trim().toLowerCase();
  const res = /** @type { import("@azure/functions").HttpResponseFull} */ (
    context.res
  );

  /**
   * Marks the response as an error with the given type, message, and status code.
   * @param {string} type
   * @param {string | {}} message
   * @param {number} [status]
   */
  const errorResponse = (type, message, status = 400) => {
    res.body = {
      error: {
        type,
        message
      }
    };
    res.type("application/json");
    res.status(status);
  };

  try {
    if (req.method === "GET") {
      errorResponse(
        "Method Not Allowed",
        `Service is running, but it only responds to POST with 'application/json' content type.  (2025-10-06)`,
        405
      );

      res.set("X-Robots-Tag", "noindex"); //For preventing search indexing
      //Status 200.
    } else if (
      req.method === "POST" &&
      contentType.includes("application/json")
    ) {
      // Valid POST with Json content

      // Validate input
      const validationErrors = validateInputJson(req.body);
      if (validationErrors) {
        // Failed validation
        errorResponse("validation failed", validationErrors, 400);
      } else {
        //verify captcha
        const fetchResponse_captcha = await verifyCaptcha(
          recaptchaSecret,
          req.body.captcha["g-recaptcha-response"]
        );

        if (fetchResponse_captcha.success) {
          // captcha is good, post to database

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

          const tablesInfo = /** @type {TablesInfo} */ (await result.json());
          const myTable = tablesInfo.tables.find(
            table =>
              table.id === airTableTableIdOrName ||
              table.name === airTableTableIdOrName
          );
          if (!myTable) {
            throw new Error(
              `Table with ID or Name '${airTableTableIdOrName}' not found in base '${airTableBaseId}'`
            );
          }

          //console.log("Tables Info:", JSON.stringify(tablesInfo.tables, null, 2));

          /** @type {FormData} */
          const formData = req.body.formData;

          // convert formData to fields object
          /** @type {{ [key: string]: string | number }} */
          const fields = {};
          formData.forEach(item => {
            const metaField = myTable.fields.find(f => f.name === item.name);
            if (!metaField) {
              throw new Error(
                `Field with name '${item.name}' not found in table '${myTable.name}'.`
              );
            }

            const isNumberfield = metaField.type === "number";

            if (isNumberfield) {
              fields[item.name] = Number(item.value);
            } else {
              fields[item.name] = item.value;
            }
          });

          const fetchResponse = await postToAirTable(
            PersonalAccessToken,
            airTableBaseId,
            airTableTableIdOrName,
            fields
          );

          const responseContentType = fetchResponse.headers.get("content-type");
          if (responseContentType) res.type(responseContentType);

          res.status(fetchResponse.status);
          res.body = await fetchResponse.json();
          if (res.body.error) {
            res.body.error.message = `Airtable POST failed - ${res.body.error.message}`;
          }
        } else {
          // Failed captcha
          errorResponse(
            "Captcha failed",
            `Failed human detection. Error Codes ${JSON.stringify(fetchResponse_captcha["error-codes"])}`,
            401
          );
        }
      }
    } else {
      // NOT POST
      errorResponse(
        "Method Not Allowed",
        `Service is running, but it only responds to POST with 'application/json' content type. (Method was:${req.method}, Content-type was:${contentType}, Body was :${JSON.stringify(req.body)})`,
        405
      );
    }
  } catch (e) {
    // ERROR
    //@ts-ignore
    errorResponse(e.name, e.message);
  }
}
