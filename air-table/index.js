module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.method === 'GET') {
        //Hitting the service by default will show the index page.
        context.res = {
            body: fs.readFileSync(`${appName}/index.html`, 'utf8'),
            headers: {
                'Content-Type': 'text/html'
            }
        };

        context.done();
        return;
    }

    const name = (req.query.name || (req.body && req.body.name));
    const responseMessage = name
        ? "Hello, " + name + ". This HTTP triggered function executed successfully."
        : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
}