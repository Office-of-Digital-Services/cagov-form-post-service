//@ts-check
import fs from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {import("@azure/functions").InvocationContext} context
 * @param {import("@azure/functions").HttpRequest} req
 */
export default async function (context, req) {
  context.log("JavaScript HTTP trigger function processed a request.");

  const res = {
    /** @type {Record<string, string>} */
    headers: {},
    status: 200,
    body: ""
  };

  const file = req.params.page?.trim().toLowerCase() || "index";

  switch (file) {
    case "robots.txt":
      res.body = fs.readFileSync(`${__dirname}/robots.txt`, "utf8");
      res.headers["Cache-Control"] = "max-age=2592000"; //1 month

      break;
    case "index":
    case "sample":
    case "success":
      res.body = fs.readFileSync(`${__dirname}/${file}.html`, "utf8");

      res.headers["Content-Type"] = "text/html";
      break;
    default:
      res.body = `File not found - ${file}`;
      res.status = 404;
  }
  return res;
}
