/**
 * Self-check: OAuth base URL + cookie domain (www / apex / preview).
 * Run: node api/_lib.oauth.check.js
 */
import assert from "node:assert/strict";

process.env.APP_BASE_URL = "https://guessify.uk";
process.env.SESSION_SECRET = "test-secret-for-oauth-check-only";

const { getBase, configuredCookieDomain } = await import("./_lib.js");

assert.equal(configuredCookieDomain(), "guessify.uk");

assert.equal(
  getBase({
    headers: {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "www.guessify.uk",
    },
  }),
  "https://guessify.uk",
  "www request still uses apex redirect_uri"
);

assert.equal(
  getBase({
    headers: {
      "x-forwarded-proto": "https",
      host: "guessify.uk",
    },
  }),
  "https://guessify.uk"
);

assert.equal(
  getBase({
    headers: {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "guessify-abc.vercel.app",
    },
  }),
  "https://guessify-abc.vercel.app",
  "preview host must match its own cookie"
);

assert.equal(
  getBase({
    headers: {
      "x-forwarded-proto": "http",
      host: "localhost:3000",
    },
  }),
  "http://localhost:3000"
);

console.log("_lib.oauth.check: ok");
