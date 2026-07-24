import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("accessory offer and booking contracts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.rentaro.test/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetches live offers with encoded context and no cache", async () => {
    const offers = [
      {
        code: "courier-pro",
        name: "Courier Pro",
        benefit: "Carry the essentials for a full shift.",
        components: [
          { code: "battery", name: "Extra battery" },
          { code: "lock", name: "Lock" },
          { code: "phone", name: "Phone holder" },
        ],
        recurringPrice: 79,
        savingAmount: 11,
        recommended: true,
        placement: "primary",
        available: true,
        unavailableComponent: null,
        extraBatteryDeposit: null,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(offers));
    vi.stubGlobal("fetch", fetchMock);
    const { getAccessoryOffers } = await import("@/services/accessoryOfferService");

    const result = await getAccessoryOffers({
      planId: "p365",
      cityId: "tallinn & nearby",
      locale: "et",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.rentaro.test/api/public/accessory-offers?planId=p365&cityId=tallinn+%26+nearby&locale=et",
      expect.objectContaining({
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
    );
    expect(result).toEqual(offers);
  });

  it("normalizes omitted nullable fields so the Bike Only offer has an explicit null code", async () => {
    // The backend serializer omits null-valued properties, so the Bike Only
    // offer arrives without a "code" key at all.
    const bikeOnly = {
      name: "Bike Only",
      benefit: "Ride with your own gear.",
      components: [],
      recurringPrice: 0,
      savingAmount: 0,
      recommended: false,
      placement: "primary",
      available: true,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([bikeOnly]));
    vi.stubGlobal("fetch", fetchMock);
    const { getAccessoryOffers } = await import("@/services/accessoryOfferService");

    const [offer] = await getAccessoryOffers({
      planId: "p365",
      cityId: "tallinn",
      locale: "en",
    });

    expect(offer.code).toBeNull();
    expect(offer.unavailableComponent).toBeNull();
    expect(offer.extraBatteryDeposit).toBeNull();
  });

  it("preserves a server status and error code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: "accessory_unavailable" }, 409),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { AccessoryOfferApiError, getAccessoryOffers } = await import(
      "@/services/accessoryOfferService"
    );

    await expect(
      getAccessoryOffers({ planId: "p30", cityId: "tallinn", locale: "en" }),
    ).rejects.toMatchObject({
      name: "AccessoryOfferApiError",
      status: 409,
      code: "accessory_unavailable",
    });
    await expect(
      getAccessoryOffers({ planId: "p30", cityId: "tallinn", locale: "en" }),
    ).rejects.toBeInstanceOf(AccessoryOfferApiError);
  });

  it("submits the stable offer code without the legacy accessory id array", async () => {
    const result = {
      id: "booking-1",
      portalToken: "portal-token",
      status: "submitted",
      createdAt: "2026-07-22T09:00:00Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(result, 201));
    vi.stubGlobal("fetch", fetchMock);
    const { submitBooking } = await import("@/services/bookingService");

    await submitBooking({
      cityId: "tallinn",
      modelId: "engine-pro",
      planId: "p365",
      accessoryOfferCode: "courier-pro",
      preferredStartDate: "2026-08-01",
      customer: {
        firstName: "Ada",
        lastName: "Rider",
        email: "ada@example.com",
        phone: "+3725550000",
      },
      locale: "en",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ accessoryOfferCode: "courier-pro" });
    expect(body).not.toHaveProperty("accessoryIds");
  });

  it("preserves booking stock conflicts for an inline retry state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: "accessory_unavailable" }, 409),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { submitBooking } = await import("@/services/bookingService");

    await expect(
      submitBooking({
        cityId: "tallinn",
        modelId: "engine-pro",
        planId: "p30",
        accessoryOfferCode: "courier-pro",
        preferredStartDate: "2026-08-01",
        customer: {
          firstName: "Ada",
          lastName: "Rider",
          email: "ada@example.com",
          phone: "+3725550000",
        },
      }),
    ).rejects.toMatchObject({
      name: "BookingApiError",
      status: 409,
      code: "accessory_unavailable",
    });
  });
});
