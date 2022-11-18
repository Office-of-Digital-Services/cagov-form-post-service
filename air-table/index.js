//@ts-check
module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  if (req.method === 'GET') {
    context.res = {
      body: GetResponseHTML,
      headers: {
        'Content-Type': 'text/html'
      }
    };

    return;
  }

  const name = req.query.name || req.body;
  const responseMessage = name
    ? `Hello, ${name}. This HTTP triggered function executed successfully.`
    : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: responseMessage
  };
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
        <form method="post">
          <input type="text" name="name" value="TEST" />
          <input type="submit" value="Manual post submission"/>
        </form>
      </li>
    </ul>
    </body>
</html>
`;