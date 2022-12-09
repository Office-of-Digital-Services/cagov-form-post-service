//@ts-check
import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appu01tGlmTTMm5uX"; //State Web Template - Feedback
const airTableTableIdOrName = "tblzXJo4byB53ssWE"; //Contact us responses

const recaptchaApiUrl = "https://www.google.com/recaptcha/api/siteverify";
// https://developers.google.com/recaptcha/docs/verify

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

  if (req.method === "POST" && contentType.includes("application/json")) {
    //verify captcha
    const captchaPostTargert = `${recaptchaApiUrl}?secret=${recaptchaSecret}&response=${req.body.captcha["g-recaptcha-response"]}`;

    const fetchResponse_captcha = /** @type { recaptchaResult }*/ (await fetch(captchaPostTargert, { method: "POST" })
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

    if (fetchResponse_captcha.success) {
      // captcha is good, post to database

      //we can use the domain from captcha in data
      req.body.fields["Form Source"] = fetchResponse_captcha.hostname;

      // Post data to database
      /** @type { import("node-fetch").RequestInit } */
      const fetchRequest = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PersonalAccessToken}`
        },
        body: JSON.stringify({
          fields: req.body.fields
        })
      };

      const fetchResponse = await fetch(`${airTableApiUrl}/${airTableBaseId}/${airTableTableIdOrName}`, fetchRequest);

      contextRes = {
        body: await fetchResponse.json(),
        headers: {
          "Content-Type": fetchResponse.headers.get("content-type")
        },
        status: fetchResponse.status
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
        status: 401 //Unauthorized
      };
    }
  } else {
    // NOT POST
    contextRes = {
      body: {
        error: {
          type: "Method Not Allowed",
          message: `Service is running, but it only responds to POST with 'application/json' content type. (Method was:${req.method}, Content-type was:${contentType})`
        }
      },
      headers: {
        "Content-Type": "application/json"
      },
      status: 405 // Method Not Allowed
    };
  }

  context.res = contextRes;
}