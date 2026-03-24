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
