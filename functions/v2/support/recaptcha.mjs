//@ts-check

/**
 * @typedef recaptchaResult
 * @property {boolean} success
 * @property {string?} action
 * @property {string?} challenge_ts
 * @property {string?} hostname
 * @property {number?} score
 * @property {string[]?} [error-codes]
 */

const recaptchaApiUrl = "https://www.google.com/recaptcha/api/siteverify";
// ReCAPTCHA Verifying the user's response
// https://developers.google.com/recaptcha/docs/verify

/**
 * @param {string} recaptchaSecret
 * @param {string} g_recaptcha_response
 */
const verifyCaptcha = (recaptchaSecret, g_recaptcha_response) =>
  /** @type { Promise<recaptchaResult> }*/ (
    fetch(
      `${recaptchaApiUrl}?secret=${recaptchaSecret}&response=${g_recaptcha_response}`,
      { method: "POST" }
    )
      .then(async response => {
        if (response.ok) {
          return await response.json();
        }

        console.error(response);

        throw new Error(`captcha failed`);
      })
      .catch(error => {
        console.error(error);
        return { success: false };
      })
  );

export { verifyCaptcha };
