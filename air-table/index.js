//@ts-check
const fetch = require("node-fetch/lib");

const airTableApiUrl = "https://api.airtable.com/v0";

module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  const baseId = process.env["baseId"];
  const tableIdOrName = process.env["tableIdOrName"];

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
};