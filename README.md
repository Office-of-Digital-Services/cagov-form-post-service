# cagov-form-post-service (v2)

A reusable, configuration‑driven Azure Functions API for securely posting form submissions to Airtable.

This version replaces the older “copy‑and‑deploy per site” template. Instead of creating a new Function App for every website, **a single deployment can now support multiple sites**, each configured through environment variables or Azure Key Vault.

The service performs:

- Input parsing from `FormData` POST requests
- reCAPTCHA v3 verification
- Airtable table/field validation (using Airtable’s own error messages)
- Record creation in Airtable
- Consistent JSON responses for success and error states

There is **no hard‑coded schema**. Each site defines its own Airtable base, table, and field expectations through configuration.

---

## ✨ Key Features

### Multi‑site support

One Azure Function App can now serve any number of websites. Each site is configured through environment variables following a naming convention.

### Schema‑agnostic

The service no longer ships with a JSON Schema. Instead, it relies on Airtable’s own validation errors to determine whether the incoming form fields match the table structure.

### Secure configuration via Azure Key Vault

All secrets — Airtable tokens, reCAPTCHA keys, and per‑site configuration — can be stored in Key Vault and referenced via `@Microsoft.KeyVault(...)`.

### Drop‑in replacement for the template contact form

This service powers the contact form at:  
https://template.webstandards.ca.gov/contact-us.html

### CORS‑protected

Only approved origins can POST to the API.

---

## 🏗 Architecture Overview

    Browser Form → POST /api/air-table → Azure Function → Airtable API

The function:

1. Accepts `multipart/form-data` or JSON payloads
2. Normalizes input into `[name, value]` tuples
3. Verifies reCAPTCHA (required)
4. Determines which site configuration applies (based on `Origin` or explicit config)
5. Attempts to create a record in Airtable
6. Returns success or structured error JSON

---

## 🔧 Configuration

Each site is configured through environment variables. These can be stored directly in the Function App or in Azure Key Vault.

### Per‑site variables

| Variable                                    | Description                               |
| ------------------------------------------- | ----------------------------------------- |
| `CAFORMPOST_<PROJECT_NAME>_ORIGINS`         | comma list of origins for requesting site |
| `CAFORMPOST_<PROJECT_NAME>_AIRTABLETOKEN`   | Airtable personal access token            |
| `CAFORMPOST_<PROJECT_NAME>_RECAPTCHASECRET` | reCAPTCHA v3 secret                       |

You can add as many sites as needed:

    CAFORMPOST_TEMPLATE_ORIGINS=https://template.webstandards.ca.gov
    CAFORMPOST_TEMPLATE_AIRTABLETOKEN=pat...
    CAFORMPOST_TEMPLATE_RECAPTCHASECRET=...

    CAFORMPOST_PARKS_ORIGINS=https://parks.ca.gov
    CAFORMPOST_PARKS_AIRTABLETOKEN=pat...
    CAFORMPOST_PARKS_RECAPTCHASECRET=...

The service automatically selects the correct site configuration based on the request origin.

---

# 📘 **API Path Structure**

The Form Post Service exposes a predictable, fully path‑based routing structure for submitting data to Airtable. Each request identifies:

1. **The project** (your multi‑tenant identifier)
2. **The Airtable Base ID**
3. **The Airtable Table ID**

This keeps routing explicit, stateless, and easy to debug.

---

## 🔗 **Submission Path**

```
/api/v2/airtable/<project_id>/<airtable_base_id>/<airtable_table_id>
```

### Example

```
/api/v2/airtable/sample/appXfKtM85FrT0Ipc/tblrWC8qRNId3mSaL
```

### Path Parameters

| Segment               | Meaning                     | Notes                                                                     |
| --------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `<project_id>`        | Your configured project key | Must match your environment variable prefix (e.g., `CAFORMPOST_SAMPLE_*`) |
| `<airtable_base_id>`  | Airtable Base ID            | Always starts with `app`                                                  |
| `<airtable_table_id>` | Airtable Table ID           | Always starts with `tbl`                                                  |

---

## 🧭 **How Routing Works**

When a request hits:

```
/api/v2/airtable/<project>/<baseId>/<tableId>
```

the handler:

1. **Parses the path** into project, baseId, tableId
2. **Loads project‑specific configuration** from environment variables
3. **Validates** that the base/table IDs are allowed for that project
4. **Processes the POST body**
5. **Submits the record to Airtable**
6. **Returns a structured JSON response** with status and metadata

This design keeps the API stateless and makes each project’s configuration fully isolated.

---

## 🧪 **Supported Methods**

### `POST /api/v2/airtable/<project>/<baseId>/<tableId>`

Submits form data to Airtable.  
This is the primary endpoint used by client‑side forms.

---

## 🧱 **Why this Path Structure?**

- **Explicit** — no hidden configuration or magic routing
- **Discoverable** — developers can understand the API from the URL alone
- **Multi‑tenant** — each project is isolated and self‑contained
- **Secure** — Airtable tokens stay server‑side; only IDs appear in the path
- **Future‑proof** — easy to extend with additional metadata endpoints

# 🚀 Deployment

This service runs as an **Azure Function App** using the JavaScript v4 programming model.

## Existing deployments

- **Production:** https://api.template.webstandards.ca.gov/api/v2
- **Staging:** https://fa-cdt-pub-migr-betaws-w-p-001-stage.azurewebsites.net/api/v2
- **Dev:** https://dev.api.template.webstandards.ca.gov/api/v2 (not running)

---

## 🧪 Local Development

1. Clone the repo
2. Create a `local.settings.json` (see `sample.local.settings.json`)
3. Install dependencies:

   npm install

4. Start the function app:

   npm start

The function will be available at:

- http://localhost:12345/api/v2

All relevant links will be running at

- http://localhost:12345/

Running Samples will be found at

- http://localhost:12345/sample_fetch/
- http://localhost:12345/sample_form_post/

## Azure DevOps Locations

- https://calenterprise.visualstudio.com/CDT.beta.template.webtools.website/_build
- https://calenterprise.visualstudio.com/CDT.beta.template.webtools.website/_release

## Azure Locations

- [Stage (fa-cdt-pub-migr-betaws-w-p-001/Stage)](https://portal.azure.com/#@digitalca.onmicrosoft.com/resource/subscriptions/005fa005-b981-47d8-8b39-5b82adf6569c/resourceGroups/rg-cdt-pub-migr-webstandards-w-p-001/providers/Microsoft.Web/sites/fa-cdt-pub-migr-betaws-w-p-001/slots/Stage/appServices)
- [fa-cdt-pub-migr-betaws-w-p-001](https://portal.azure.com/#@digitalca.onmicrosoft.com/resource/subscriptions/005fa005-b981-47d8-8b39-5b82adf6569c/resourceGroups/RG-CDT-PUB-MIGR-WebStandards-W-P-001/providers/Microsoft.Web/sites/fa-cdt-pub-migr-betaws-w-p-001/appServices)

## Airtable Personal access tokens

Create them [https://airtable.com/create/tokens](here)

Ensure that your base is added to the `Access` section

Permissions required

    data.records:write
    schema.bases:read

## Get you Airtable base and table ids

When you are looking at your Airtable, the URL has that information

    https://airtable.com/appXXXXXXXX/tblYYYYYYYY/

appXXXXXXXX - Your Base ID  
tblYYYYYYYY - Your Table ID
