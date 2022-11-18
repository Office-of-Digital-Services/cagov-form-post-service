//@ts-check
const fetch = require("node-fetch/lib");

module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const PersonalAccessToken = process.env["AirTablePersonalAccessToken"];
  const baseId = process.env["baseId"];
  const tableIdOrName = process.env["tableIdOrName"];

  if (req.method === 'GET') {
    // GET
    context.res = {
      body: GetResponseHTML,
      headers: {
        'Content-Type': 'text/html'
      }
    };
  } else {
    // POST
    const jsonFormData = req.body;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PersonalAccessToken}`
    };

    const result = await performPostHttpRequest(`https://api.airtable.com/v0/${baseId}/${tableIdOrName}`, headers, jsonFormData);

    context.res = {
      // status: 200, /* Defaults to 200 */
      body: JSON.stringify(result, null, 2)
    };
  }
};


const GetResponseHTML = `
<html>
  <head>
    <title>
      cagov-form-post-service AirTable
    </title>
  </head>
  <body>
    <h1>cagov-form-post-service AirTable</h1>

    <p>What do you want to do?</p>
    <ul>
      <li>
        <form method="POST">
          <input type="text" name="Name" value="Test Name" />
          <input type="text" name="Notes" value="Test Notes" />
          <input type="submit" value="Manual post submission"/>
        </form>
      </li>
    </ul>
    </body>
</html>
`;

async function performPostHttpRequest(/** @type {String} */ fetchLink,/** @type {HeadersInit} */ headers, /** @type {any} */ body) {
  if (!fetchLink || !headers || !body) {
    throw new Error("One or more POST request parameters was not passed.");
  }
  try {
    const rawResponse = await fetch(fetchLink, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    const content = await rawResponse.json();
    return content;
  }
  catch (err) {
    console.error(`Error at fetch POST: ${err}`);
    throw err;
  }
}