import { app } from "@azure/functions";
import post from "./functions/v2/post.mjs";
import get from "./functions/v2/get.mjs";
import options from "./functions/v2/options.mjs";
import mydefault from "./functions/default/index.mjs";

// API route for version 2 of the API
app.http("V2_post", {
  route: "api/v2/airtable/{project}/{airtableBaseId}/{airtableTableId}",
  methods: ["POST"],
  handler: post
});

app.http("V2_getprojecttest", {
  route: "api/v2/airtable/{project}/{airtableBaseId}/{airtableTableId}",
  methods: ["GET"],
  handler: get
});

// API route for version 2 of the API
app.http("V2_options", {
  route: "api/v2/airtable/{project}/{airtableBaseId}/{airtableTableId}",
  methods: ["OPTIONS"],
  handler: options
});

// Default route which serves static files from the "public" directory
app.http("default", {
  route: "{page?}",
  methods: ["GET"],
  handler: mydefault
});
