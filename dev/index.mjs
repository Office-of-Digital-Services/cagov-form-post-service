//@ts-check
import fetch from "node-fetch";

// eslint-disable-next-line
import siteconfig from "./siteconfig.json" assert { type: "json" };

const yo = siteconfig.allowedUrls.find(
  e => e === "https://api.airtable.com/v0"
);

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

// AitTable Base and Table IDs are not treated as secrets
const airTableBaseId = "appu01tGlmTTMm5uX"; //Enter your Airtable base ID
const airTableTableIdOrName = "tblzXJo4byB53ssWE"; //Enter your Airtable table ID

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

  const res = /** @type { import("@azure/functions").HttpResponseFull} */ (
    context.res
  );
  if (req.method === "GET") {
    const response = await getTableSchema(PersonalAccessToken);
    if (!response.ok) {
      res.body = {
        error: {
          type: response.statusText,
          message: `Error fetching table schema from Airtable.`
        }
      };
      res.type("application/json");
      res.set("X-Robots-Tag", "noindex"); //For preventing search indexing
      return;
    }

    res.body = await response.json();

    //Status 200.
  }
}

/**
 * @param {string} PersonalAccessToken
 */
function getTableSchema(PersonalAccessToken) {
  /** @type { import("node-fetch").RequestInit } */
  const fetchRequest = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PersonalAccessToken}`,
      "Content-Type": "application/json"
    }
  };

  return fetch(
    `${airTableApiUrl}/meta/bases/${airTableBaseId}/tables`,
    fetchRequest
  );
}
