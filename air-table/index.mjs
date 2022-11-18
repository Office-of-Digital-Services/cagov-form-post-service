//@ts-check
import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";

export default async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  const baseId = process.env["AirTableBaseId"];
  const tableIdOrName = process.env["AirTableTableIdOrName"];

  if (req.method === 'POST') {
    // POST
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PersonalAccessToken}`
    };

    const rawResponse = await fetch(`${airTableApiUrl}/${baseId}/${tableIdOrName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body)
    });

    context.res = {
      body: await rawResponse.json(),
      headers: {
        "Content-Type": rawResponse.headers.get("content-type")
      },
      status: rawResponse.status
    };
  } else {
    // NOT POST
    context.res = {
      body: 'Service only responds to POST'
    };
  }
}