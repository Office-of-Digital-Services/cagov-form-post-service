//@ts-check
import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

export default async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  const baseId = process.env["AirTableBaseId"];
  const tableIdOrName = process.env["AirTableTableIdOrName"];

  if (req.method === 'POST') {
    /** @type { import("node-fetch").RequestInit } */
    const request = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PersonalAccessToken}`
      },
      body: JSON.stringify(req.body)
    };

    const response = await fetch(`${airTableApiUrl}/${baseId}/${tableIdOrName}`, request);

    context.res = {
      body: await response.json(),
      headers: {
        "Content-Type": response.headers.get("content-type")
      },
      status: response.status
    };
  } else {
    // NOT POST
    context.res = {
      body: 'Service only responds to POST'
    };
  }
}