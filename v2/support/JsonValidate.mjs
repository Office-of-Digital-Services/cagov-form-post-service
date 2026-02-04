//@ts-check

import Ajv from "ajv";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const jsonSchema = require("./inputSchema.json");

/**
 * @param {{}} data
 */
function validateInputJson(data) {
  /** @type { import("ajv").Options } */
  const ajvOptions = { allErrors: true };

  const ajv = new Ajv(ajvOptions);

  const validate = ajv.compile(jsonSchema);
  const valid = validate(data);
  if (!valid) {
    console.log(validate.errors);
    return validate.errors;
  }
}
export { validateInputJson };
