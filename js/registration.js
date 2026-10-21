import { RegistrationApi } from "./registration-api.js";

export function initializeRegistration(root, api = new RegistrationApi()) {
  const form = root.querySelector("[data-registration-form]");
  const fields = root.querySelector("[data-registration-fields]");
  const status = root.querySelector("[data-registration-status]");
  const retry = root.querySelector("[data-registration-retry]");
  const button = form.querySelector('[type="submit"]');
  const inputs = ["full_name", "email"].map((key) => form.elements.namedItem(key));
  let busy = false;
  let full = false;
  let confirmed = false;

  function showAvailability({ remaining, available }) {
    full = !available;
    fields.disabled = full || confirmed;
    if (confirmed) {
      status.textContent = `Tu registro fue confirmado. ¡Nos vemos en CENTRO! ${full ? "Cupo completo." : `Lugares restantes: ${remaining}.`}`;
    } else {
      status.textContent = full ? "Cupo completo" : `${remaining === 1 ? "Queda 1 lugar disponible" : `Quedan ${remaining} lugares disponibles`}. Completa tus datos para registrarte.`;
    }
  }

  function clearError(input) {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    root.querySelector(`[data-registration-error="${input.name}"]`).textContent = "";
  }

  function showError(input, message) {
    input.setAttribute("aria-invalid", "true");
    root.querySelector(`[data-registration-error="${input.name}"]`).textContent = message;
  }

  async function checkAvailability() {
    if (busy) return;
    busy = true;
    retry.hidden = true;
    fields.disabled = true;
    status.textContent = "Consultando lugares disponibles…";
    try {
      showAvailability(await api.availability());
    } catch {
      status.textContent = "No pudimos consultar los lugares disponibles. Intenta de nuevo.";
      retry.hidden = false;
    } finally {
      busy = false;
    }
  }

  inputs.forEach((input) => input.addEventListener("input", () => clearError(input)));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || full || confirmed || fields.disabled) return;
    inputs.forEach((input) => {
      clearError(input);
      input.value = input.value.trim();
      input.setCustomValidity(input.value ? "" : "Completa este campo.");
    });
    if (!form.reportValidity()) return;

    const registration = Object.fromEntries(inputs.map((input) => [input.name, input.value]));
    busy = true;
    fields.disabled = true;
    retry.hidden = true;
    form.setAttribute("aria-busy", "true");
    button.textContent = "Enviando…";
    status.textContent = "Estamos registrando tu asistencia…";
    try {
      await api.register(registration);
      confirmed = true;
      form.reset();
      form.hidden = true;
      status.textContent = "Tu registro fue confirmado. ¡Nos vemos en CENTRO!";
      try {
        showAvailability(await api.availability());
      } catch {
        // Availability failure must never replace a successful registration.
        status.textContent += " No pudimos actualizar los lugares disponibles.";
      }
    } catch (error) {
      if (error.status === 409 && error.code === "event_full") {
        showAvailability({ remaining: 0, available: false });
      } else if (error.status === 409 && error.code === "already_registered") {
        status.textContent = "Este correo ya está registrado.";
        showError(form.elements.namedItem("email"), "Este correo ya está registrado.");
      } else if (error.status === 422) {
        const otherErrors = [];
        for (const [key, messages] of Object.entries(error.errors)) {
          const message = (Array.isArray(messages) ? messages : [messages]).filter((value) => typeof value === "string").join(" ");
          if (!message) continue;
          const input = inputs.find((candidate) => candidate.name === key);
          if (input) showError(input, message);
          else otherErrors.push(message);
        }
        status.textContent = ["Revisa los datos de tu registro.", ...otherErrors].join(" ");
      } else {
        status.textContent = "No pudimos confirmar tu registro. Puedes intentar de nuevo; si el envío anterior se guardó, te indicaremos que tu correo ya está registrado.";
      }
    } finally {
      busy = false;
      fields.disabled = full || confirmed;
      form.removeAttribute("aria-busy");
      button.textContent = "Registrarme";
      if (!fields.disabled) inputs.find((input) => input.hasAttribute("aria-invalid"))?.focus();
    }
  });

  retry.addEventListener("click", checkAvailability);
  return checkAvailability();
}

const root = typeof document !== "undefined" && document.querySelector("[data-registration]");
if (root) {
  initializeRegistration(root, new RegistrationApi({
    availabilityUrl: import.meta.env.VITE_REGISTRATION_AVAILABILITY_URL || undefined,
    registrationUrl: import.meta.env.VITE_REGISTRATION_URL || undefined,
  }));
}
