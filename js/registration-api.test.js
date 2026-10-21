import assert from "node:assert/strict";
import test from "node:test";
import { RegistrationApi, RegistrationError } from "./registration-api.js";

const registration = { full_name: "María Pérez López", email: "maria@example.test" };
const api = (fetcher) => new RegistrationApi({ fetcher });

test("the default fetcher preserves the browser receiver for GET and POST", async (t) => {
  const methods = [];
  t.mock.method(globalThis, "fetch", function (url, options) {
    assert.equal(this, globalThis, "native Window.fetch rejects a different receiver");
    methods.push(options.method ?? "GET");
    return Promise.resolve(options.method === "POST"
      ? new Response(null, { status: 201 })
      : Response.json({ remaining: 100, available: true }));
  });
  const service = new RegistrationApi();
  await service.availability();
  await service.register(registration);
  assert.deepEqual(methods, ["GET", "POST"]);
});

test("availability uses the event URL without cookies or cache", async () => {
  const service = api(async (url, options) => {
    assert.equal(url, "https://centro.juanfuent.es/api/events/caligraf-2026/availability");
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    return Response.json({ remaining: 25, available: true });
  });
  assert.deepEqual(await service.availability(), { remaining: 25, available: true });
});

test("available false closes registration even when remaining is positive", async () => {
  assert.deepEqual(await api(async () => Response.json({ remaining: 25, available: false })).availability(), { remaining: 25, available: false });
  assert.deepEqual(await api(async () => Response.json({ remaining: 0, available: true })).availability(), { remaining: 0, available: false });
});

test("malformed availability and server failures do not open registration", async () => {
  for (const remaining of [-1, 101, 1.5, "10", null, undefined]) {
    await assert.rejects(api(async () => Response.json({ remaining, available: true })).availability());
  }
  await assert.rejects(api(async () => Response.json({ remaining: 10 })).availability());
  await assert.rejects(api(async () => new Response(null, { status: 503 })).availability());
});

test("registration sends the nested contract and requires 201", async () => {
  await api(async (url, options) => {
    assert.equal(url, "https://centro.juanfuent.es/api/events/caligraf-2026/registrations");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "omit");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), { registration });
    return new Response(null, { status: 201 });
  }).register({ ...registration, ignored: true });
  for (const status of [200, 202, 204]) {
    await assert.rejects(api(async () => new Response(null, { status })).register(registration));
  }
});

test("both conflicts and field validation errors retain their meaning", async () => {
  for (const error of ["event_full", "already_registered"]) {
    await assert.rejects(api(async () => Response.json({ error }, { status: 409 })).register(registration),
      (result) => result instanceof RegistrationError && result.status === 409 && result.code === error);
  }
  const errors = { full_name: ["es obligatorio"], email: ["no es válido"] };
  await assert.rejects(api(async () => Response.json({ errors }, { status: 422 })).register(registration), (result) => {
    assert.equal(result.status, 422);
    assert.deepEqual(result.errors, errors);
    return true;
  });
});

test("failed or uncertain submissions are never retried automatically", async () => {
  for (const failure of [500, "network"]) {
    let calls = 0;
    const service = api(async () => {
      calls += 1;
      if (failure === "network") throw new TypeError("Connection lost");
      return new Response("Server error", { status: failure });
    });
    await assert.rejects(service.register(registration));
    assert.equal(calls, 1);
  }
});
