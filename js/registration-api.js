const EVENT_URL = "https://centro.juanfuent.es/api/events/caligraf-2026";

export class RegistrationError extends Error {
  constructor(status, { error, errors } = {}) {
    super("Registration request failed");
    this.status = status;
    this.code = error;
    this.errors = errors && typeof errors === "object" ? errors : {};
  }
}

export class RegistrationApi {
  constructor({
    baseUrl = EVENT_URL,
    availabilityUrl = `${baseUrl}/availability`,
    registrationUrl = `${baseUrl}/registrations`,
    // Window.fetch requires its browser receiver; calling it as this.fetcher is invalid.
    fetcher = (...args) => globalThis.fetch(...args),
  } = {}) {
    this.availabilityUrl = availabilityUrl;
    this.registrationUrl = registrationUrl;
    this.fetcher = fetcher;
  }

  async availability() {
    const response = await this.fetcher(this.availabilityUrl, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Availability request failed");
    const data = await response.json();
    if (!Number.isInteger(data.remaining) || data.remaining < 0 ||
        data.remaining > 100 || typeof data.available !== "boolean") {
      throw new Error("Invalid availability response");
    }
    return { remaining: data.remaining, available: data.available && data.remaining > 0 };
  }

  async register({ full_name, email }) {
    // A lost response may still represent a saved registration. Never retry automatically.
    const response = await this.fetcher(this.registrationUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ registration: { full_name, email } }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 201) return;
    const data = await response.json().catch(() => ({}));
    throw new RegistrationError(response.status, data ?? {});
  }
}
