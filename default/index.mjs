//@ts-check
import fs from "fs";
/**
 * @type {import("@azure/functions").AzureFunction}
 * @param {import("@azure/functions").HttpRequest} req
 */
export default async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const res = /** @type { import("@azure/functions").HttpResponseFull} */ (
    context.res
  );

  switch (req.params.page?.trim().toLowerCase()) {
    case "robots.txt":
      res.body = fs.readFileSync(
        `${context.executionContext.functionDirectory}/robots.txt`,
        "utf8"
      );

      res.set("Cache-Control", "max-age=2592000"); //1 month
      break;
    case "sample":
      res.body = fs.readFileSync(
        `${context.executionContext.functionDirectory}/sample.html`,
        "utf8"
      );
      res.type("html");
      break;
    default:
      res.body = "File not found.";
      res.status(404);
  }
}
