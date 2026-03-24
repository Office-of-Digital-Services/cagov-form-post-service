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
  /** @type { import("node-fetch").RequestInit } */
  const fetchRequest = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PersonalAccessToken}`
    },
    body: JSON.stringify({
      fields
    })
  };

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

  const json = /** @type {AirTableErrorResponse} */ (
    await fetchResponse.json()
  );

  if (!json.error.type) {
    // Handles unexpected error format
    json.error = { type: "UnknownError", message: json.error.toString() };
  }

  return json;
};

export { postToAirTable, airTableApiUrl, airTableProcessError };
