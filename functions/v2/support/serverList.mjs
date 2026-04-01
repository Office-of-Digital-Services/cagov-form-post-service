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
    throw new Error(`Missing configuration for: ${key}`);
  }
  return value || "";
};

/**
 * @param {string} path path from request header
 */
function getServerConfig(path) {
  const parts = path.split("/");
  const [project, airtableBaseId, airtableTableId] = parts;
  const projectUpper = project.toUpperCase();

  /** @type {ServerConfig} */
  const serverConfig = {
    project,
    airtableBaseId,
    airtableTableId,
    airtableToken: getEnvVar(`CAFORMPOST_${projectUpper}_AIRTABLETOKEN`),
    recaptchaSecret: getEnvVar(`CAFORMPOST_${projectUpper}_RECAPTCHASECRET`),
    origins: getEnvVar(`CAFORMPOST_${projectUpper}_ORIGINS`).split(",")
  };

  return serverConfig;
}

export { getServerConfig };
