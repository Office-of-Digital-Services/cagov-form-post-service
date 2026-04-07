//@ts-check

import fetch from "node-fetch";

const airTableApiUrl = "https://api.airtable.com/v0";
// AirTable Create Records API Reference
// https://airtable.com/developers/web/api/create-records

/**
 * @typedef {object} TableFieldOption
 * @property {string} id - The unique identifier for the option.
 * @property {string} name - The display name of the option.
 * @property {string} color - The color associated with the option.
 */

/**
 * @typedef {object} TableField
 * @property {string} type - The type of the field (e.g., "singleLineText", "number", "email", "date", "singleSelect").
 * @property {string} id - The unique identifier for the field.
 * @property {string} name - The display name of the field.
 * @property {string} [description] - The description of the field.
 * @property {{ precision?: number, dateFormat?: { name: string, format: string }, choices?: TableFieldOption[] }} [options] - Field-specific options.
 */

/**
 * @typedef {object} TableView
 * @property {string} id - The unique identifier for the view.
 * @property {string} name - The display name of the view.
 * @property {string} type - The type of the view (e.g., "grid").
 */

/**
 * @typedef {object} Table
 * @property {string} id - The unique identifier for the table.
 * @property {string} name - The display name of the table.
 * @property {string} primaryFieldId - The ID of the primary field.
 * @property {string} [description] - The description of the table.
 * @property {TableField[]} fields - The fields in the table.
 * @property {TableView[]} views - The views available for the table.
 */

/**
 * @typedef {object} TablesInfo
 * @property {Table[]} tables - The list of tables.
 */

/**
 * @typedef {object} AirTableErrorResponse
 * @property {{type: string, message: string}} error - The error message from Airtable.
 */

/**
 * @param {string} PersonalAccessToken
 * @param {string} airTableBaseId
 * @param {string} airTableTableIdOrName
 * @param {*} fields
 */
function postToAirTable(
  PersonalAccessToken,
  airTableBaseId,
  airTableTableIdOrName,
  fields
) {
  const fetchRequest = getRequestInit(PersonalAccessToken, "POST", {
    fields
  });

  return fetch(
    `${airTableApiUrl}/${airTableBaseId}/${airTableTableIdOrName}`,
    fetchRequest
  );
}

/**
 * @param {import("node-fetch").Response} fetchResponse
 */
const airTableProcessError = async fetchResponse => {
  if (fetchResponse.ok) {
    throw new Error(
      `Expected error response, got success: ${fetchResponse.status}`
    );
  }

  console.error(
    `Airtable API error: ${fetchResponse.status} ${fetchResponse.statusText}`
  );

  const json = /** @type {AirTableErrorResponse} */ (
    await fetchResponse.json()
  );

  if (!json.error.type) {
    // Handles unexpected error format
    json.error = { type: "UnknownError", message: json.error.toString() };
  }

  return json;
};

/**
 * Gets the RequestInit object for fetch calls to Airtable API, including the Authorization header and optional body.
 * @param {string} PersonalAccessToken
 * @param {"GET" | "POST"} method
 * @param {*} [body]
 */
const getRequestInit = (
  PersonalAccessToken,
  method = "GET",
  body = undefined
) => {
  const Authorization = `Bearer ${PersonalAccessToken}`;

  /** @type { import("node-fetch").RequestInit } */
  const fetchRequest = body
    ? {
        method,
        headers: {
          Authorization,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    : {
        method,
        headers: {
          Authorization
        }
      };

  return fetchRequest;
};

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

/**
 * Returns a single Table object from Airtable
 * @param {string} PersonalAccessToken
 * @param {string} airtableBaseId
 * @param {string} airtableTableId - Can be either the table ID or the table Name
 */
const getTable = async (
  PersonalAccessToken,
  airtableBaseId,
  airtableTableId
) => {
  // Get table info from airtable API
  const infoRequest = getRequestInit(PersonalAccessToken);

  console.log(
    "Fetching Airtable base and table information for Base ID:",
    airtableBaseId
  );

  const result = await fetch(
    `${airTableApiUrl}/meta/bases/${airtableBaseId}/tables`,
    infoRequest
  );

  console.log("Airtable response status:", result.status);

  if (!result.ok)
    throw new Error(
      `Base ID '${airtableBaseId}' not found. Is schema.bases:read present in the token's scopes?`
    );

  const tablesInfo = /** @type {import("./airTable.mjs").TablesInfo} */ (
    await airTableProcessResponse(result)
  );

  const myTable = tablesInfo.tables.find(
    table =>
      table.id === airtableTableId ||
      table.name.toLowerCase() === airtableTableId.toLowerCase()
  );
  if (!myTable)
    throw new Error(
      `Table with ID or Name '${airtableTableId}' not found in base '${airtableBaseId}'`
    );

  return myTable;
};

export {
  postToAirTable,
  airTableApiUrl,
  airTableProcessError,
  getRequestInit,
  getTable
};
