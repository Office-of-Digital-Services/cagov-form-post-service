import fetch from "node-fetch";

export default async function (context) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const fetchResponse = await fetch('https://www.google.com');

  context.res.body = await fetchResponse.text();

}