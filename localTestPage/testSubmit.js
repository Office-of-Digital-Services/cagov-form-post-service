// @ts-check
const url = "http://localhost:12345/api/air-table";

// eslint-disable-next-line no-unused-vars
function initform() {
  /** @type {HTMLFormElement} */
  const sampleForm = document.querySelector("form");
  if (sampleForm) {
    sampleForm.action = "";
    sampleForm.addEventListener("submit", submitForm);
  } else {
    console.error('No form on page.');
  }
}

async function submitForm(/** @type { SubmitEvent } */ e) {
  e.preventDefault();

  /** @type { HTMLButtonElement } */
  const btnSubmit = document.querySelector('form input[type=submit]');

  if (btnSubmit) {
    btnSubmit.disabled = true;
    setTimeout(() => btnSubmit.disabled = false, 2000);
  }

  // eslint-disable-next-line no-extra-parens
  const form = /** @type { HTMLFormElement } */ (e.target);

  const jsonFormData = { fields: {} };
  for (const pair of new FormData(form)) {
    jsonFormData.fields[pair[0]] = pair[1];
  }

  /** @type { RequestInit } */
  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(jsonFormData)
  };

  const response = await fetch(url, request)
    .then(r => r.json());

  console.log(response);
  alert(JSON.stringify(response, null, 2));
}