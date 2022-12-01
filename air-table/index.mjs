//@ts-check
import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appu01tGlmTTMm5uX"; //State Web Template - Feedback
const airTableTableIdOrName = "tblzXJo4byB53ssWE"; //Contact us responses

/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").HttpRequest} req
 */
export default async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  //PersonalAccessToken is a secret and should be kept in a key vault
  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];

  const contentType = req.headers["content-type"]?.trim().toLowerCase();

  if (req.method === "POST" && contentType.includes("application/json")) {
    /** @type { import("node-fetch").RequestInit } */
    const fetchRequest = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PersonalAccessToken}`
      },
      body: JSON.stringify({
        fields: req.body
      })
    };

    const fetchResponse = await fetch(`${airTableApiUrl}/${airTableBaseId}/${airTableTableIdOrName}`, fetchRequest);

    /** @type { import("@azure/functions").HttpResponseSimple} */
    const res = {
      body: await fetchResponse.json(),
      headers: {
        "Content-Type": fetchResponse.headers.get("content-type")
      },
      status: fetchResponse.status
    };

    context.res = res;
  } else {
    // NOT POST
    context.res = {
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
}