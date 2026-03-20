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
3. Verifies reCAPTCHA (if enabled for the site)
4. Determines which site configuration applies (based on `Origin` or explicit config)
5. Attempts to create a record in Airtable
6. Returns success or structured error JSON

---

## 🔧 Configuration

Each site is configured through environment variables. These can be stored directly in the Function App or in Azure Key Vault.

### Required host list variable

| Variable   | Sample                     |
| ---------- | -------------------------- |
| `HostList` | "LOCALHOST,PARKS,TEMPLATE" |

### Required per‑site variables

| Variable                            | Description                    |
| ----------------------------------- | ------------------------------ |
| `<SITE_NAME>_host`                  | Full URL of requesting site    |
| `<SITE_NAME>_airtableToken`         | Airtable personal access token |
| `<SITE_NAME>_airTableBaseId`        | Airtable base ID               |
| `<SITE_NAME>_airTableTableIdOrName` | Airtable table name            |
| `<SITE_NAME>_ReCaptchaSecret`       | reCAPTCHA v3 secret            |

You can add as many sites as needed:

    TEMPLATE_airtableToken_=pat...
    TEMPLATE_airTableBaseId=app...
    TEMPLATE_airTableTableIdOrName=tbl...
    TEMPLATE_host=https://template.webstandards.ca.gov
    TEMPLATE_recaptchaSecret=...

    PARKS_airtableToken=pat...
    PARKS_airTableBaseId=app...
    PARKS_airTableTableIdOrName=tbl...
    PARKS_host=https://parks.ca.gov
    PARKS_recaptchaSecret=...

The service automatically selects the correct site configuration based on the request origin.

---

## 🚀 Deployment

This service runs as an **Azure Function App** using the JavaScript v4 programming model.

### Existing deployments

- **Production:** https://api.template.webstandards.ca.gov/api/v2
- **Staging:** https://fa-cdt-pub-migr-betaws-w-p-001-stage.azurewebsites.net/v2
- **Dev:** https://dev.api.template.webstandards.ca.gov/v2

---

## 🧪 Local Development

1. Clone the repo
2. Create a `local.settings.json` (see `sample.local.settings.json`)
3. Install dependencies:

   npm install

4. Start the function app:

   npm start

The function will be available at:

    http://localhost:12345/api/v2

All relavant links will be running at

    http://localhost:12345/

Running Sample will be found at

    http://localhost:12345/sample/
