import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
  API_BASE: "https://api.rentaro.ee",
}));

import {
  cancelExtension,
  listInvoices,
  portalInvoicePdfUrl,
  requestExtension,
} from "@/services/portalService";

describe("portalService rental extensions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits only the server option, expected end, consent, and idempotency key", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ extension: { id: "ext-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      requestExtension(
        "signed token",
        {
          optionCode: "p180",
          expectedPlannedEndDate: "2026-07-15",
          consent: true,
        },
        "27e168b9-1b81-45d8-92ce-eb774f3e44c2",
      ),
    ).resolves.toMatchObject({ kind: "ok" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.rentaro.ee/api/portal/rental/extensions?token=signed%20token",
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      "27e168b9-1b81-45d8-92ce-eb774f3e44c2",
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      optionCode: "p180",
      expectedPlannedEndDate: "2026-07-15",
      consent: true,
    });
  });

  it("preserves stable backend conflict codes so stale state can be reloaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "rental_end_changed",
          error: "The rental end date changed.",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(
      requestExtension(
        "token",
        {
          optionCode: "p30",
          expectedPlannedEndDate: "2026-07-15",
          consent: true,
        },
        "same-safe-key",
      ),
    ).resolves.toEqual({
      kind: "conflict",
      code: "rental_end_changed",
      message: "The rental end date changed.",
    });
  });

  it("cancels only the named unpaid extension through the token-scoped route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: "Cancelled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(cancelExtension("signed token", "extension/1")).resolves.toMatchObject({
      kind: "ok",
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.rentaro.ee/api/portal/rental/extensions/extension%2F1/cancel?token=signed%20token",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("loads invoice history without browser or framework caching", async () => {
    const invoices = [
      {
        id: "invoice-1",
        number: "R-2026-0042",
        status: "issued",
        locale: "en",
        issueDate: "2026-07-13",
        dueDate: "2026-07-15",
        total: 147,
        currency: "EUR",
        hasPdf: true,
      },
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(invoices), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(listInvoices("signed token")).resolves.toMatchObject({
      kind: "ok",
      data: invoices,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.rentaro.ee/api/portal/invoices?token=signed%20token",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("builds an encoded token-scoped PDF URL without exposing storage keys", () => {
    expect(portalInvoicePdfUrl("invoice/42", "signed token&locale=ru")).toBe(
      "/api/portal/invoices/invoice%2F42/pdf?token=signed%20token%26locale%3Dru",
    );
  });
});
