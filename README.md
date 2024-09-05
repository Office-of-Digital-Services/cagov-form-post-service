# cagov-form-post-service

Service code for making your own form data post service.

This service runs as an Azure [Function App](https://portal.azure.com/#create/Microsoft.FunctionApp).

## File descriptions

| Name                             | Description                                            |
| :------------------------------- | :----------------------------------------------------- |
| **`air-table\index.mjs`**        | Main function.                                         |
| **`air-table\inputSchema.json`** | JSON Valiation Schema used to validate API input body. |

This implementation is used for https://template.webstandards.ca.gov/contact-us.html

A working example using this can be found [here](https://github.com/Office-of-Digital-Services/California-State-Web-Template-Website/blob/6.0.9/pages/contact-us-form.html).

## CORS

CORS is enabled on the function service. The following web sites are allowed to connect to the API.

- (Production)
  - https://template.webstandards.ca.gov
  - https://as-cdt-pub-migr-betaws-ww-p-001-stage.azurewebsites.net
  - http://localhost:8080
- (Staging)
  - https://as-cdt-pub-migr-betaws-ww-p-001-stage.azurewebsites.net
  - http://localhost:8080

## Secrets

The following secrets need to be defined in your Azure Function App
| Name | Description |
| :--------------------------------- | :------------------------------------------------------------------- |
| **`AirTablePersonalAccessToken`** | API Personal access token to post to AirTable. [AirTable tokens](https://airtable.com/create/tokens) |
| **`ReCaptchaSecret`** | Google ReCaptch Secret Key. [V3 Admin Console](https://www.google.com/recaptcha/admin) |
