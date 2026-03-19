//@ts-check

// AitTable Base and Table IDs are not treated as secrets
/**
 * @typedef {object} ServerConfig
 * @property {string} host
 * @property {string} name
 * @property {string} airTableBaseId
 * @property {string} airTableTableIdOrName
 * @property {string} airTablePersonalAccessTokenKey
 * @property {string} reCaptchaSecretKey
 */

const hostListString = process.env.HostList || "";
/** @type {Array<ServerConfig>} */
const jsonServerList = hostListString
  .split(",")
  .map(pair => pair.split("|"))
  .map(parts => {
    const name = parts[0].trim();
    const host = parts[1].trim();

    const getEnvVar = (/** @type {string} */ key) => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
      }
      return value;
    };

    const airTableTableIdOrName = getEnvVar(`${name}_airTableTableIdOrName`);
    const airTableBaseId = getEnvVar(`${name}_airTableBaseId`);
    const airTablePersonalAccessTokenKey = getEnvVar(
      `${name}_airTablePersonalAccessTokenKey`
    );
    const reCaptchaSecretKey = getEnvVar(`${name}_ReCaptchaSecret`);

    return {
      name,
      host,
      airTableBaseId,
      airTableTableIdOrName,
      airTablePersonalAccessTokenKey,
      reCaptchaSecretKey
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
