//@ts-check
import fetch from "node-fetch";
import Ajv from "ajv"; // For JSON Schema validation

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appprn2mWnev0xDDQ"; //Enter your Airtable base ID
const airTableTableIdOrName = "tblYx6JoBnJGOncHa"; //Enter your Airtable table ID

const recaptchaApiUrl = "https://www.google.com/recaptcha/api/siteverify";
// ReCAPTCHA Verifying the user's response
// https://developers.google.com/recaptcha/docs/verify

/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").HttpRequest} req
 */
export default async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  //PersonalAccessToken is a secret and should be kept in a key vault
  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];

  //ReCaptchaSecret is a secret and should be kept in a key vault
  const recaptchaSecret = process.env["ReCaptchaSecret"];

  const contentType = req.headers["content-type"]?.trim().toLowerCase();

  const res = /** @type { import("@azure/functions").HttpResponseFull} */ (
    context.res
  );
  if (req.method === "GET") {
    res.body = {
      error: {
        type: "Method Not Allowed",
        message: `Service is running, but it only responds to POST with 'application/json' content type.`
      }
    };
    res.type("application/json");
    res.set("X-Robots-Tag", "noindex"); //For preventing search indexing
    //Status 200.
  } else if (
    req.method === "POST" &&
    contentType.includes("application/json") &&
    req.body?.fields
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

        //we can use the domain from captcha in data
        req.body.fields["Form Source"] = fetchResponse_captcha.hostname;

        const fetchResponse = await postToAirTable(
          PersonalAccessToken,
          req.body.fields
        );
        res.type(fetchResponse.headers.get("content-type"));
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
 * @param {{}} fields
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
