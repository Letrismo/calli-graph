import assert from "node:assert/strict";
import test from "node:test";
import { initializeRegistration } from "./registration.js";
import { RegistrationError } from "./registration-api.js";

// Minimal DOM fixture for controller transitions; native validation is declared in HTML.
function fixture() {
  function element() {
    const attributes = new Map();
    const listeners = new Map();
    return {
      hidden: false, disabled: false, textContent: "", value: "",
      addEventListener: (type, handler) => listeners.set(type, handler),
      trigger: (type) => listeners.get(type)?.({ preventDefault() {} }),
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: (key) => attributes.delete(key),
      hasAttribute: (key) => attributes.has(key),
      setCustomValidity() {}, focus() {},
    };
  }
  const form = element(), fields = element(), status = element(), retry = element(), button = element();
  const inputs = Object.fromEntries(["full_name", "email"].map((name) => [name, Object.assign(element(), { name, value: name === "email" ? "maria@example.test" : "valor" })]));
  const errors = Object.fromEntries(Object.keys(inputs).map((name) => [name, element()]));
  form.elements = { namedItem: (key) => inputs[key] };
  form.querySelector = () => button;
  form.reportValidity = () => true;
  form.reset = () => Object.values(inputs).forEach((input) => { input.value = ""; });
  const nodes = { "[data-registration-form]": form, "[data-registration-fields]": fields, "[data-registration-status]": status, "[data-registration-retry]": retry };
  const root = { querySelector: (selector) => nodes[selector] ?? errors[selector.match(/data-registration-error="(.*?)"/)?.[1]] };
  return { root, form, fields, status, retry, button, inputs, errors };
}
const available = { remaining: 1, available: true };

test("available false disables the form even with places remaining", async () => {
  const ui = fixture();
  await initializeRegistration(ui.root, { availability: async () => ({ remaining: 5, available: false }) });
  assert.equal(ui.fields.disabled, true);
  assert.equal(ui.status.textContent, "Cupo completo");
});

test("success refreshes availability and preserves confirmation if refresh fails", async () => {
  for (const refreshFails of [true, false]) {
    const ui = fixture();
    let reads = 0;
    await initializeRegistration(ui.root, {
      availability: async () => {
        if (++reads === 1) return available;
        if (refreshFails) throw new Error("Network error");
        return { remaining: 0, available: false };
      },
      register: async () => {},
    });
    await ui.form.trigger("submit");
    assert.equal(reads, 2);
    assert.equal(ui.form.hidden, true);
    assert.equal(ui.fields.disabled, true);
    assert.match(ui.status.textContent, /registro fue confirmado/);
  }
});

test("event_full closes the form after positive availability", async () => {
  const ui = fixture();
  await initializeRegistration(ui.root, {
    availability: async () => available,
    register: async () => { throw new RegistrationError(409, { error: "event_full" }); },
  });
  await ui.form.trigger("submit");
  assert.equal(ui.status.textContent, "Cupo completo");
  assert.equal(ui.fields.disabled, true);
  assert.equal(ui.inputs.email.value, "maria@example.test");
});

test("duplicate email and validation errors appear beside fields", async () => {
  for (const error of [
    new RegistrationError(409, { error: "already_registered" }),
    new RegistrationError(422, { errors: { full_name: ["es obligatorio"], email: ["no es válido"] } }),
  ]) {
    const ui = fixture();
    await initializeRegistration(ui.root, { availability: async () => available, register: async () => { throw error; } });
    await ui.form.trigger("submit");
    assert.ok(ui.errors.email.textContent);
    assert.equal(ui.inputs.email.hasAttribute("aria-invalid"), true);
    assert.equal(ui.fields.disabled, false);
    if (error.status === 422) {
      assert.equal(ui.errors.full_name.textContent, "es obligatorio");
    }
    await ui.inputs.email.trigger("input");
    assert.equal(ui.errors.email.textContent, "");
    assert.equal(ui.inputs.email.hasAttribute("aria-invalid"), false);
  }
});

test("network failure keeps data and permits retry; concurrent submissions are blocked", async () => {
  const ui = fixture();
  let rejectPost;
  let calls = 0;
  await initializeRegistration(ui.root, {
    availability: async () => available,
    register: () => { calls += 1; return new Promise((resolve, reject) => { rejectPost = reject; }); },
  });
  const submission = ui.form.trigger("submit");
  assert.equal(ui.fields.disabled, true);
  assert.equal(ui.button.textContent, "Enviando…");
  await ui.form.trigger("submit");
  assert.equal(calls, 1);
  rejectPost(new TypeError("Network error"));
  await submission;
  assert.equal(ui.fields.disabled, false);
  assert.equal(ui.inputs.email.value, "maria@example.test");
  assert.equal(ui.form.hasAttribute("aria-busy"), false);
});

test("availability failure can be retried", async () => {
  const ui = fixture();
  let calls = 0;
  await initializeRegistration(ui.root, {
    availability: async () => {
      if (++calls === 1) throw new Error("Server error");
      return available;
    },
  });
  assert.equal(ui.fields.disabled, true);
  assert.equal(ui.retry.hidden, false);
  await ui.retry.trigger("click");
  assert.equal(calls, 2);
  assert.equal(ui.fields.disabled, false);
  assert.equal(ui.retry.hidden, true);
  assert.equal(ui.status.textContent, "Completa tus datos.");
});

test("blank or whitespace-only fields never send a registration", async () => {
  for (const values of [["", ""], ["   ", "maria@example.test"], ["María", "   "]]) {
    const ui = fixture();
    let submissions = 0;
    await initializeRegistration(ui.root, {
      availability: async () => available,
      register: async () => { submissions += 1; },
    });
    [ui.inputs.full_name.value, ui.inputs.email.value] = values;
    await ui.form.trigger("submit");
    assert.equal(submissions, 0);
  }
});
