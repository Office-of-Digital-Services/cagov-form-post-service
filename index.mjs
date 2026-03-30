import { app } from "@azure/functions";
import post from "./functions/v2/post.mjs";
import options from "./functions/v2/options.mjs";
import mydefault from "./functions/default/index.mjs";

// API route for version 2 of the API
app.http("V2_post", {
  route: "api/v2/airtable/{*path}",
  methods: ["POST"],
  handler: post
});

// API route for version 2 of the API
app.http("V2_get", {
  route: "api/v2/airtable/{*path}",
  methods: ["GET"],
  handler: () => ({
    status: 302,
    headers: {
      Location: "/"
    }
  })
});

// API route for version 2 of the API
app.http("V2_options", {
  route: "api/v2/airtable/{*path}",
  methods: ["OPTIONS"],
  handler: options
});

// Default route which serves static files from the "public" directory
app.http("default", {
  route: "{page?}",
  methods: ["GET"],
  handler: mydefault
});
