import { app } from "@azure/functions";
import v2 from "./functions/v2/index.mjs";
import mydefault from "./functions/default/index.mjs";

// API route for version 2 of the API
app.http("v2", {
  route: "api/v2/{*path}",
  methods: ["GET", "POST", "OPTIONS"],
  handler: v2
});

// Default route which serves static files from the "public" directory
app.http("default", {
  route: "{page?}",
  methods: ["GET"],
  handler: mydefault
});
