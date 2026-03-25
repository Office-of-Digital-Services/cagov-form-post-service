//@ts-check
import fs from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {import("@azure/functions").HttpRequest} req
 * @param {import("@azure/functions").InvocationContext} context
 */
export default async function (req, context) {
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
    default: {
      const filePath = `${__dirname}/pages/${file}.html`;

      if (fs.existsSync(filePath)) {
        res.body = fs.readFileSync(filePath, "utf8");
        res.headers["Content-Type"] = "text/html";
      } else {
        res.body = `File not found - ${file}`;
        res.status = 404;
      }
    }
  }
  return res;
}
