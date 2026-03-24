import { app } from "@azure/functions";
import v2 from "./functions/v2/index.mjs";
import mydefault from "./functions/default/index.mjs";

app.http("v2", {
  route: "api/v2",
  methods: ["GET", "POST"],
  handler: v2
});

app.http("default", {
  route: "{page?}",
  methods: ["GET"],
  handler: mydefault
});

app.http("v2Options", {
  methods: ["OPTIONS"],
  route: "api/v2",
  handler: async () => {
    return {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "86400"
      }
    };
  }
});
