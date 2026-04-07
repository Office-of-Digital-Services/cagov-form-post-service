//@ts-check
import fetch from "node-fetch";
import {
  airTableApiUrl,
  airTableProcessError,
  getRequestInit
} from "./airTable.mjs";

/**
 * @param {import("node-fetch").Response} fetchResponse
 */
const airTableProcessResponse = async fetchResponse => {
  if (fetchResponse.ok) {
    return await fetchResponse.json();
  } else {
    // Airtable API error
    const error = await airTableProcessError(fetchResponse);

    throw new Error(
      `${fetchResponse.status}: Airtable API Error - ${error.error.type}: ${error.error.message}`
    );
  }
};

const getTable = async (
  /** @type {import("./serverList.mjs").ServerConfig} */ serverConfig
) => {
  // Get table info from airtable API
  const infoRequest = getRequestInit(serverConfig.airtableToken);

  console.log(
    "Fetching Airtable base and table information for Base ID:",
    serverConfig.airtableBaseId
  );

  const result = await fetch(
    `${airTableApiUrl}/meta/bases/${serverConfig.airtableBaseId}/tables`,
    infoRequest
  );

  console.log("Airtable response status:", result.status);

  if (!result.ok)
    throw new Error(
      `Base ID '${serverConfig.airtableBaseId}' not found. Is schema.bases:read present in the token's scopes?`
    );

  const tablesInfo = /** @type {import("./airTable.mjs").TablesInfo} */ (
    await airTableProcessResponse(result)
  );

  const myTable = tablesInfo.tables.find(
    (/** @type {{ id: any; name: any; }} */ table) =>
      table.id === serverConfig.airtableTableId ||
      table.name === serverConfig.airtableTableId
  );
  if (!myTable)
    throw new Error(
      `Table with ID or Name '${serverConfig.airtableTableId}' not found in base '${serverConfig.airtableBaseId}'`
    );

  return myTable;
};

export { getTable };
