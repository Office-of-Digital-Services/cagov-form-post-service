//@ts-check

// AitTable Base and Table IDs are not treated as secrets
/**
 * @typedef {object} ServerConfig
 * @property {string} airtableBaseId
 * @property {string} airtableTable
 * @property {string} airtableToken
 * @property {string} recaptchaSecret
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
 * @param {string} origin origin URL from request header
 */
function getServerConfigByHost(origin) {
  const hostList = getEnvVar("HostList").split(",");
  const name = hostList.find(onename => {
    const serverHost = getEnvVar(`${onename}_origins`, false);
    return serverHost.split(",").includes(origin);
  });
  if (!name) {
    throw new Error(`No server configuration found for host: ${origin}`);
  }

  /** @type {ServerConfig} */
  const serverConfig = {
    airtableBaseId: getEnvVar(`${name}_airtableBaseId`),
    airtableTable: getEnvVar(`${name}_airtableTable`),
    airtableToken: getEnvVar(`${name}_airtableToken`),
    recaptchaSecret: getEnvVar(`${name}_recaptchaSecret`)
  };

  return serverConfig;
}

export { getServerConfigByHost };
