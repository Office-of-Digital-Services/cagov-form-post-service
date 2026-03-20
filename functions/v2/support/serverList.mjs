//@ts-check

// AitTable Base and Table IDs are not treated as secrets
/**
 * @typedef {object} ServerConfig
 * @property {string} host
 * @property {string} name
 * @property {string} airtableBaseId
 * @property {string} airtableTable
 * @property {string} airtableToken
 * @property {string} recaptchaSecret
 */

const getEnvVar = (/** @type {string} */ key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const hostListString = getEnvVar("HostList");
/** @type {Array<ServerConfig>} */
const jsonServerList = hostListString.split(",").map(name => {
  const host = getEnvVar(`${name}_host`);
  const airtableTable = getEnvVar(`${name}_airtableTable`);
  const airtableBaseId = getEnvVar(`${name}_airtableBaseId`);
  const airtableToken = getEnvVar(`${name}_airtableToken`);
  const recaptchaSecret = getEnvVar(`${name}_recaptchaSecret`);

  return {
    name,
    host,
    airtableBaseId,
    airtableTable,
    airtableToken,
    recaptchaSecret
  };
});

/**
 * @param {string} host
 */
function getServerConfigByHost(host) {
  const serverConfig = jsonServerList.find(server => server.host === host);
  if (!serverConfig) {
    throw new Error(`No server configuration found for host: ${host}`);
  }
  return serverConfig;
}

export { getServerConfigByHost };
