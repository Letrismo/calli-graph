import assert from "node:assert/strict";
import test from "node:test";
import { TurnstileChallenge, TURNSTILE_SITE_KEY, loadTurnstile } from "./turnstile.js";

function fixture(loader) {
  const nodes = Object.fromEntries(["data-turnstile", "data-turnstile-status", "data-turnstile-retry"].map((key) => [key, {
    textContent: "", hidden: false,
    addEventListener(type, callback) { this.click = callback; },
  }]));
  const challenge = new TurnstileChallenge({ querySelector: (selector) => nodes[selector.slice(1, -1)] }, { loader });
  return { challenge, status: nodes["data-turnstile-status"], retry: nodes["data-turnstile-retry"] };
}

test("widget uses the Rails action and clears tokens on expiry, timeout and errors", async () => {
  let options;
  let resets = 0;
  const api = {
    render(container, parameters) { options = parameters; return "widget-1"; },
    reset(id) { assert.equal(id, "widget-1"); resets += 1; },
  };
  const { challenge, retry } = fixture(async () => api);
  challenge.container.clientWidth = 260;
  let changes = 0;
  await challenge.start(() => changes += 1);
  assert.equal(options.sitekey, TURNSTILE_SITE_KEY);
  assert.equal(options.action, "event_registration");
  assert.equal(options.size, "compact");
  assert.equal(options["response-field"], false);
  for (const callback of ["expired-callback", "timeout-callback", "error-callback"]) {
    options.callback("token");
    assert.equal(challenge.getToken(), "token");
    options[callback]();
    assert.equal(challenge.getToken(), "");
  }
  assert.equal(retry.hidden, false);
  options.callback("fresh-token");
  assert.equal(retry.hidden, true);
  challenge.reset();
  assert.equal(challenge.getToken(), "");
  assert.equal(resets, 1);
  assert.ok(changes > 1);
});

test("a failed script load can be retried; re-render removes the old widget", async () => {
  let attempts = 0;
  let removed;
  const { challenge, status, retry } = fixture(async () => {
    if (++attempts === 1) throw new Error("Blocked script");
    return { render: () => "widget-1", remove: (id) => removed = id };
  });
  await challenge.start(() => {});
  assert.equal(challenge.getToken(), "");
  assert.equal(retry.hidden, false);
  assert.match(status.textContent, /No pudimos cargar/);
  await retry.click();
  assert.equal(retry.hidden, true);
  await challenge.start(() => {});
  assert.equal(removed, "widget-1");
});

test("script loads once from Cloudflare and can recover from network failure", async (t) => {
  const scripts = [];
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const previousTurnstile = Object.getOwnPropertyDescriptor(globalThis, "turnstile");
  t.after(() => {
    for (const [key, descriptor] of [["document", previousDocument], ["turnstile", previousTurnstile]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  Object.defineProperty(globalThis, "document", { value: {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { append: (script) => scripts.push(script) },
  }, configurable: true });
  const first = loadTurnstile();
  assert.equal(loadTurnstile(), first);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  scripts[0].onerror();
  await assert.rejects(first);
  assert.equal(scripts[0].removed, true);
  const second = loadTurnstile();
  const api = {};
  Object.defineProperty(globalThis, "turnstile", { value: api, configurable: true });
  scripts[1].onload();
  assert.equal(await second, api);
});
