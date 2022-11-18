const localTarget = "http://localhost:12345/api/air-table";

// eslint-disable-next-line no-unused-vars
function initform() {
  /** @type {HTMLFormElement | null} */
  const sampleForm = document.querySelector("form");
  if (sampleForm) {
    sampleForm.action = "";
    sampleForm.addEventListener("submit", function (e) {
      submitForm(e, this);
    });
  } else {
    console.error('No form on page.');
  }
}

async function submitForm(/** @type { SubmitEvent } */ e,/** @type { HTMLFormElement } */ form) {
  e.preventDefault();

  /** @type { HTMLButtonElement | null } */
  const btnSubmit = document.querySelector('form input[type=submit]');

  if (btnSubmit) {
    btnSubmit.disabled = true;
    setTimeout(() => btnSubmit.disabled = false, 2000);
  }

  const jsonFormData = { fields: {} };
  for (const pair of new FormData(form)) {
    jsonFormData.fields[pair[0]] = pair[1];
  }

  const headers = {
    "Content-Type": "application/json",
  };

  const response = await performPostHttpRequest(localTarget, headers, jsonFormData);
  console.log(response);

  if (response)
    alert(JSON.stringify(response, null, 2));
  else
    alert(`An error occured.`);

}

async function performPostHttpRequest(/** @type {String} */ fetchLink,/** @type {HeadersInit} */ headers, /** @type {any} */ body) {
  if (!fetchLink || !headers || !body) {
    throw new Error("One or more POST request parameters was not passed.");
  }
  try {
    const rawResponse = await fetch(fetchLink, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    const content = await rawResponse.json();
    return content;
  }
  catch (err) {
    console.error(`Error at fetch POST: ${err}`);
    throw err;
  }
}