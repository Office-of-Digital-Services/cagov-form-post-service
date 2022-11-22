//@ts-check
import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").HttpRequest} req 
 */
export default async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  const baseId = process.env["AirTableBaseId"];
  const tableIdOrName = process.env["AirTableTableIdOrName"];

  if (req.method === "POST") {
    /** @type { import("node-fetch").RequestInit } */
    const fetchReqeust = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PersonalAccessToken}`
      },
      body: JSON.stringify(req.body)
    };

    const fetchResponse = await fetch(`${airTableApiUrl}/${baseId}/${tableIdOrName}`, fetchReqeust);

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
      body: 'Service only responds to POST'
    };
  }
}