/**
 * Self-check: OAuth base URL + cookie domain (www / apex / preview).
 * Run: node api/_lib.oauth.check.js
 */
import assert from "node:assert/strict";

process.env.APP_BASE_URL = "https://guessify.uk";
process.env.SESSION_SECRET = "test-secret-for-oauth-check-only";

const { getBase, configuredCookieDomain, oauthNeedsApexBounce } = await import(
  "./_lib.js"
);

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
  "https://guessify.uk",
  "preview must use APP_BASE_URL redirect_uri (registered with Spotify)"
);

assert.equal(
  oauthNeedsApexBounce({
    headers: { "x-forwarded-host": "guessify-abc.vercel.app" },
  }),
  true
);

assert.equal(
  oauthNeedsApexBounce({
    headers: { "x-forwarded-host": "www.guessify.uk" },
  }),
  false,
  "www shares apex cookie domain — no bounce needed"
);

assert.equal(
  oauthNeedsApexBounce({
    headers: { host: "guessify.uk" },
  }),
  false
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
