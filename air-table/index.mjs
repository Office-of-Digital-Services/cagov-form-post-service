//@ts-check
import fetch from "node-fetch";
import Ajv from "ajv"; // For JSON Schema validation

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appu01tGlmTTMm5uX"; //State Web Template - Feedback
const airTableTableIdOrName = "tblzXJo4byB53ssWE"; //Contact us responses

const recaptchaApiUrl = "https://www.google.com/recaptcha/api/siteverify";
// ReCAPTCHA Verifying the user's response
// https://developers.google.com/recaptcha/docs/verify

/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").HttpRequest} req
 */
export default async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  //PersonalAccessToken is a secret and should be kept in a key vault
  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];

  //ReCaptchaSecret is a secret and should be kept in a key vault
  const recaptchaSecret = process.env["ReCaptchaSecret"];

  const contentType = req.headers["content-type"]?.trim().toLowerCase();

  /** @type { import("@azure/functions").HttpResponseSimple} */
  let contextRes = null;
  if (req.method === "GET") {
    contextRes = {
      body: {
        error: {
          type: "Method Not Allowed",
          message: `Service is running, but it only responds to POST with 'application/json' content type.`
        }
      },
      headers: {
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex" //For preventing search indexing
      },
      statusCode: 200
    };
  } else if (req.method === "POST" && contentType.includes("application/json") && req.body?.fields) {
    // Valid POST with Json content

    // Validate input
    const validationErrors = validateInputJson(req.body);
    if (validationErrors) {
      // Failed validation
      contextRes = {
        body: {
          error: {
            type: "validation failed",
            message: validationErrors
          }
        },
        headers: {
          "Content-Type": "application/json"
        },
        statusCode: 400 // Bad Request
      };
    } else {
      //verify captcha
      const fetchResponse_captcha = await verifyCaptcha(recaptchaSecret, req.body.captcha["g-recaptcha-response"]);

      if (fetchResponse_captcha.success) {
        // captcha is good, post to database

        //we can use the domain from captcha in data
        req.body.fields["Form Source"] = fetchResponse_captcha.hostname;

        const fetchResponse = await postToAirTable(PersonalAccessToken, req.body.fields);

        contextRes = {
          body: await fetchResponse.json(),
          headers: {
            "Content-Type": fetchResponse.headers.get("content-type")
          },
          statusCode: fetchResponse.status
        };
      } else {
        // Failed captcha
        contextRes = {
          body: {
            error: {
              type: "Captcha failed",
              message: `Failed human detection. Error Codes ${JSON.stringify(fetchResponse_captcha["error-codes"])}`
            }
          },
          headers: {
            "Content-Type": "application/json"
          },
          statusCode: 401 //Unauthorized
        };
      }
    }
  } else {
    // NOT POST
    contextRes = {
      body: {
        error: {
          type: "Method Not Allowed",
          message: `Service is running, but it only responds to POST with 'application/json' content type. (Method was:${req.method}, Content-type was:${contentType}, Body was :${JSON.stringify(req.body)})`
        }
      },
      headers: {
        "Content-Type": "application/json"
      },
      statusCode: 405 // Method Not Allowed
    };
  }

  context.res = contextRes;
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
const verifyCaptcha = (recaptchaSecret, g_recaptcha_response) => /** @type { Promise<recaptchaResult> }*/(
  fetch(`${recaptchaApiUrl}?secret=${recaptchaSecret}&response=${g_recaptcha_response}`,
    { method: "POST" })
    .then(async response => {
      if (response.ok) {
        return await response.json();
      }

      console.error(response);

      throw new Error(
        `captcha failed`
      );
    })
    .catch(error => {
      console.error(error);
      return { success: false };
    }));


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
      "Authorization": `Bearer ${PersonalAccessToken}`
    },
    body: JSON.stringify({
      fields
    })
  };

  return fetch(`${airTableApiUrl}/${airTableBaseId}/${airTableTableIdOrName}`, fetchRequest);
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const jsonSchema = require('./inputSchema.json');

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