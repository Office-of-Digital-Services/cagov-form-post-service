//@ts-check
import fetch from "node-fetch";
import Ajv from "ajv"; // For JSON Schema validation

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appXfKtM85FrT0Ipc"; //Enter your Airtable base ID
const airTableTableIdOrName = "tblrWC8qRNId3mSaL"; //Enter your Airtable table ID

const recaptchaApiUrl = "https://www.google.com/recaptcha/api/siteverify";
// ReCAPTCHA Verifying the user's response
// https://developers.google.com/recaptcha/docs/verify

/** @typedef {{name: string, value: string}[]} FormData */

/**
 * @typedef {object} TableFieldOption
 * @property {string} id - The unique identifier for the option.
 * @property {string} name - The display name of the option.
 * @property {string} color - The color associated with the option.
 */

/**
 * @typedef {object} TableField
 * @property {string} type - The type of the field (e.g., "singleLineText", "number", "email", "date", "singleSelect").
 * @property {string} id - The unique identifier for the field.
 * @property {string} name - The display name of the field.
 * @property {string} [description] - The description of the field.
 * @property {{ precision?: number, dateFormat?: { name: string, format: string }, choices?: TableFieldOption[] }} [options] - Field-specific options.
 */

/**
 * @typedef {object} TableView
 * @property {string} id - The unique identifier for the view.
 * @property {string} name - The display name of the view.
 * @property {string} type - The type of the view (e.g., "grid").
 */

/**
 * @typedef {object} Table
 * @property {string} id - The unique identifier for the table.
 * @property {string} name - The display name of the table.
 * @property {string} primaryFieldId - The ID of the primary field.
 * @property {string} [description] - The description of the table.
 * @property {TableField[]} fields - The fields in the table.
 * @property {TableView[]} views - The views available for the table.
 */

/**
 * @typedef {object} TablesInfo
 * @property {Table[]} tables - The list of tables.
 */

/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").Context} context
 * @param {import("@azure/functions").HttpRequest} req
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
  try {
    if (req.method === "GET") {
      res.body = {
        error: {
          type: "Method Not Allowed",
          message: `Service is running, but it only responds to POST with 'application/json' content type.  (2025-10-06)`
        }
      };
      res.type("application/json");
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
        res.body = {
          error: {
            type: "validation failed",
            message: validationErrors
          }
        };
        res.type("application/json");
        res.status(400); // Bad Request
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
          res.body = {
            error: {
              type: "Captcha failed",
              message: `Failed human detection. Error Codes ${JSON.stringify(
                fetchResponse_captcha["error-codes"]
              )}`
            }
          };
          res.type("application/json");
          res.status(401); //Unauthorized
        }
      }
    } else {
      // NOT POST
      res.body = {
        error: {
          type: "Method Not Allowed",
          message: `Service is running, but it only responds to POST with 'application/json' content type. (Method was:${
            req.method
          }, Content-type was:${contentType}, Body was :${JSON.stringify(
            req.body
          )})`
        }
      };
      res.type("application/json");
      res.status(405); // Method Not Allowed
    }
  } catch (error) {
    // ERROR
    res.body = {
      error: {
        // @ts-ignore
        type: error.name,
        // @ts-ignore
        message: error.message
      }
    };
    res.type("application/json");
    res.status(400);
  }
}

/**
 * @typedef recaptchaResult
 * @property {boolean} success
 * @property {string?} action
 * @property {string?} challenge_ts
 * @property {string?} hostname
 * @property {number?} score
 * @property {string[]?} [error-codes]
 */

/**
 * @param {string} recaptchaSecret
 * @param {string} g_recaptcha_response
 */
const verifyCaptcha = (recaptchaSecret, g_recaptcha_response) =>
  /** @type { Promise<recaptchaResult> }*/ (
    fetch(
      `${recaptchaApiUrl}?secret=${recaptchaSecret}&response=${g_recaptcha_response}`,
      { method: "POST" }
    )
      .then(async response => {
        if (response.ok) {
          return await response.json();
        }

        console.error(response);

        throw new Error(`captcha failed`);
      })
      .catch(error => {
        console.error(error);
        return { success: false };
      })
  );

/**
 * @param {string} PersonalAccessToken
 * @param {{ [key: string]: string | number }} fields
 */
function postToAirTable(PersonalAccessToken, fields) {
  /** @type { import("node-fetch").RequestInit } */
  const fetchRequest = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PersonalAccessToken}`
    },
    body: JSON.stringify({
      fields
    })
  };

  return fetch(
    `${airTableApiUrl}/${airTableBaseId}/${airTableTableIdOrName}`,
    fetchRequest
  );
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const jsonSchema = require("./inputSchema.json");

/**
 * @param {{}} data
 */
function validateInputJson(data) {
  /** @type { import("ajv").Options } */
  const ajvOptions = { allErrors: true };

  const ajv = new Ajv(ajvOptions);

  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (!valid) {
    console.log(validate.errors);
    return validate.errors;
  }
}
