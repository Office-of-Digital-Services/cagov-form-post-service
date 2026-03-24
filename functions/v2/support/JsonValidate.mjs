//@ts-check

import Ajv from "ajv";
const jsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema",
  type: "array",
  description: "Array of [name, value] tuples produced by FormData.entries().",
  minItems: 1,
  uniqueItems: true,
  items: {
    type: "array",
    minItems: 2,
    maxItems: 2,
    items: [
      { type: "string", minLength: 1 },
      { type: "string", minLength: 1 }
    ],
    additionalItems: false
  },
  contains: {
    type: "array",
    minItems: 2,
    maxItems: 2,
    items: [
      { const: "g-recaptcha-response" },
      { type: "string", minLength: 1 }
    ],
    additionalItems: false
  },
  examples: [
    [
      ["firstName", "Carter"],
      ["email", "carter@example.com"],
      ["g-recaptcha-response", "TOKEN"]
    ]
  ]
};

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
