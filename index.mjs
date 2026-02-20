import { app } from "@azure/functions";
import v2 from "./v2/index.mjs";
import mydefault from "./functions/default/index.mjs";

app.http("helloPost", {
  route: "hello",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const response = await v2(context, request);

    const body = await request.json();
    return { jsonBody: { message: `Hello ${body.name || "world"}` } };
  }
});

app.http("helloGet", {
  route: "hello",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log("GET /hello");
    return { jsonBody: { message: "Hello from GET" } };
  }
});

app.http("default", {
  route: "{page?}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => mydefault(context, request)
});
