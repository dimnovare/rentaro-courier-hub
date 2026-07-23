import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminAccessory } from "@/services/adminCatalogService";
import type { SiteSettings } from "@/types/settings";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin accessory inventory contracts", () => {
  it("encodes filters and always bypasses the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const { getAccessoryUnits } = await import(
      "@/services/adminAccessoryInventoryService"
    );

    await getAccessoryUnits({
      cityId: "tallinn & nearby",
      accessoryCode: "battery",
      status: "available",
      condition: "good",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/accessory-units?cityId=tallinn+%26+nearby&accessoryCode=battery&status=available&condition=good",
      expect.objectContaining({
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
  });

  it("preserves lifecycle conflict codes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: "Unit is held by a booking.", code: "accessory_held" }, 409),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { receiveAccessoryUnit } = await import(
      "@/services/adminAccessoryInventoryService"
    );

    await expect(receiveAccessoryUnit(17)).rejects.toMatchObject({
      name: "AccessoryInventoryApiError",
      status: 409,
      code: "accessory_held",
    });
  });

  it("posts per-unit handover conditions through the rental custody route", async () => {
    const custody = { depositDue: false, offerCode: null, items: [] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(custody));
    vi.stubGlobal("fetch", fetchMock);
    const { confirmRentalAccessoryHandover } = await import(
      "@/services/adminRentalService"
    );

    await confirmRentalAccessoryHandover("rental/17", {
      items: [{ accessoryUnitId: 42, condition: "good", notes: "Issued clean" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/rentals/rental%2F17/accessories/handover",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          items: [{ accessoryUnitId: 42, condition: "good", notes: "Issued clean" }],
        }),
      }),
    );
  });
});

describe("admin accessory metrics contracts", () => {
  it("sends the inclusive window and city with no-store", async () => {
    const metrics = {
      from: "2026-07-01",
      to: "2026-07-30",
      cityId: "tallinn",
      eligibleBookings: 0,
      attachedBookings: 0,
      attachRatePercent: 0,
      offerMix: [],
      activeBikeMonths: 0,
      recurringAccessoryRevenue: 0,
      revenuePerActiveBikeMonth: 0,
      inventoryTotal: 0,
      inventory: [],
      inspectedAssignments: 0,
      damagedAssignments: 0,
      damageRatePercent: 0,
      lostAssignments: 0,
      lossRatePercent: 0,
      currency: "EUR",
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(metrics));
    vi.stubGlobal("fetch", fetchMock);
    const { getAccessoryMetrics } = await import(
      "@/services/adminAccessoryMetricsService"
    );

    expect(
      await getAccessoryMetrics({
        from: "2026-07-01",
        to: "2026-07-30",
        cityId: "tallinn",
      }),
    ).toEqual(metrics);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/accessory-metrics?from=2026-07-01&to=2026-07-30&cityId=tallinn",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});

describe("catalog and settings accessory fields", () => {
  it("round-trips offer metadata through the catalog update", async () => {
    const accessory: AdminAccessory = {
      id: "courier-pro",
      name: "Courier Pro",
      nameLocalized: { et: "Kulleri Pro" },
      description: null,
      descriptionLocalized: {},
      price: "EUR 109 / 30d",
      price30: 109,
      price6mo: 79,
      price12mo: 79,
      isBundle: true,
      componentIds: ["battery", "lock", "phone"],
      icon: "package",
      sortOrder: 3,
      colors: [],
      isActive: true,
      customerOfferPlacement: "primary",
      isRecommended: true,
      benefit: "Shift-ready gear in one package.",
      benefitLocalized: { et: "Valmis varustus kullerivahetuseks." },
      inventoryTracked: false,
      replacementValue: 0,
      compareAtOfferCodes: ["security-kit", "battery"],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(accessory));
    vi.stubGlobal("fetch", fetchMock);
    const { updateAccessory } = await import("@/services/adminCatalogService");

    await updateAccessory(accessory.id, accessory);

    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual(accessory);
  });

  it("round-trips the optional extra-battery deposit settings", async () => {
    const settings: SiteSettings = {
      showAccessories: true,
      showReferralCode: true,
      showAddGear: true,
      showReferAcourier: true,
      showPayConfirm: true,
      showOnlineSigning: true,
      autoSendReturnReminders: true,
      deliveryFee: 0,
      extraBatteryDepositEnabled: true,
      extraBatteryDepositAmount: 150,
      bankIban: "EE00TEST",
      bankAccountName: "Valguse Kodu OU",
      bankName: "Test Bank",
      bankReference: "Booking number",
      companyName: "Valguse Kodu OU",
      companyRegCode: "14621591",
      companyVatNumber: "EE102246889",
      companyAddress: "Tallinn",
      vatRatePercent: 24,
      autoCreateInvoices: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(settings));
    vi.stubGlobal("fetch", fetchMock);
    const { updateSettings } = await import("@/services/adminSettingsService");

    await updateSettings(settings);

    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({
      extraBatteryDepositEnabled: true,
      extraBatteryDepositAmount: 150,
    });
  });
});
