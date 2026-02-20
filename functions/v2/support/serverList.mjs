//@ts-check
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// AitTable Base and Table IDs are not treated as secrets
/**
 * @typedef {object} ServerConfig
 * @property {string} host
 * @property {string} name
 * @property {string} airTableBaseId
 * @property {string} airTableTableIdOrName
 * @property {string} airTablePersonalAccessTokenKeyName
 * @property {string} reCaptchaSecretKeyName
 */

/** @type {Array<ServerConfig>} */
const jsonServerList = require("./serverList.json");

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
