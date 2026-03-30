//@ts-check

// AitTable Base and Table IDs are not treated as secrets
/**
 * @typedef {object} ServerConfig
 * @property {string} project
 * @property {string} airtableBaseId
 * @property {string} airtableTableId
 * @property {string} airtableToken
 * @property {string} recaptchaSecret
 * @property {string[]} origins
 */

const getEnvVar = (
  /** @type {string} */ key,
  /** @type {boolean?} */ required = true
) => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value || "";
};

/**
 * @param {string} path path from request header
 */
function getServerConfig(path) {
  const parts = path.split("/");
  const [project, airtableBaseId, airtableTableId] = parts;

  /** @type {ServerConfig} */
  const serverConfig = {
    project,
    airtableBaseId,
    airtableTableId,
    airtableToken: getEnvVar(`${project}_airtableToken`),
    recaptchaSecret: getEnvVar(`${project}_recaptchaSecret`),
    origins: getEnvVar(`${project}_origins`).split(",")
  };

  return serverConfig;
}

export { getServerConfig };
