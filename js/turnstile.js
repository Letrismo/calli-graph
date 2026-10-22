export const TURNSTILE_SITE_KEY = "0x4AAAAAAFgNTbVs11ctWW3p";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading;

export function loadTurnstile() {
  if (globalThis.turnstile) return Promise.resolve(globalThis.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => finish(new Error("Turnstile load timeout")), 15000);
    function finish(error) {
      clearTimeout(timeout);
      script.onload = script.onerror = null;
      if (error) {
        script.remove();
        loading = undefined;
        reject(error);
      } else {
        resolve(globalThis.turnstile);
      }
    }
    script.src = SCRIPT_URL;
    script.async = true;
    script.onerror = () => finish(new Error("Turnstile load failed"));
    script.onload = () => finish(globalThis.turnstile ? null : new Error("Turnstile unavailable"));
    document.head.append(script);
  });
  return loading;
}

export class TurnstileChallenge {
  constructor(root, { sitekey = TURNSTILE_SITE_KEY, loader = loadTurnstile } = {}) {
    this.container = root.querySelector("[data-turnstile]");
    this.status = root.querySelector("[data-turnstile-status]");
    this.retry = root.querySelector("[data-turnstile-retry]");
    this.sitekey = sitekey;
    this.loader = loader;
    this.token = "";
    this.retry.addEventListener("click", () => this.start(this.onChange));
  }

  update(token, message, retry = false) {
    this.token = token;
    this.status.textContent = message;
    this.retry.hidden = !retry;
    this.onChange?.();
  }

  async start(onChange) {
    this.onChange = onChange;
    this.update("", "Preparando verificación…");
    try {
      this.api = await this.loader();
      if (this.widgetId !== undefined) {
        this.api.remove(this.widgetId);
        this.widgetId = undefined;
      }
      this.widgetId = this.api.render(this.container, {
        sitekey: this.sitekey,
        action: "event_registration",
        theme: "dark",
        language: "es",
        size: this.container.clientWidth < 300 ? "compact" : "flexible",
        "response-field": false,
        callback: (token) => this.update(token, "Verificación completada."),
        "expired-callback": () => this.update("", "La verificación caducó. Verificando de nuevo…"),
        "timeout-callback": () => this.update("", "La verificación tardó demasiado. Intenta de nuevo.", true),
        "error-callback": () => {
          this.update("", "No pudimos verificar tu conexión. Intenta de nuevo.", true);
          return true;
        },
      });
    } catch {
      this.update("", "No pudimos cargar la verificación. Revisa tu conexión e intenta de nuevo.", true);
    }
  }

  getToken() {
    return this.token;
  }

  reset() {
    this.update("", "Verificando de nuevo…");
    if (this.widgetId !== undefined) this.api.reset(this.widgetId);
  }
}
