import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteSettings } from "@/types/settings";

const settingsApi = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));
const adminAuth = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/components/admin/AdminAuth", () => ({
  useAdminAuth: () => ({ authenticated: true, ready: true, signOut: adminAuth.signOut }),
}));
vi.mock("@/components/admin/useAdminRefresh", () => ({ useAdminRefresh: vi.fn() }));
vi.mock("@/services/adminSettingsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminSettingsService")>();
  return { ...actual, ...settingsApi };
});

import AdminSettingsPage from "@/app/[locale]/admin/settings/page";
import { SettingsApiError } from "@/services/adminSettingsService";

const baseSettings: SiteSettings = {
  showAccessories: true,
  showReferralCode: true,
  showAddGear: true,
  showReferAcourier: true,
  showPayConfirm: true,
  showOnlineSigning: true,
  autoSendReturnReminders: true,
  deliveryFee: 0,
  extraBatteryDepositEnabled: false,
  extraBatteryDepositAmount: 0,
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

describe("admin extra-battery deposit settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsApi.getSettings.mockResolvedValue(baseSettings);
    settingsApi.updateSettings.mockImplementation(async (settings: SiteSettings) => settings);
  });

  it("keeps the optional policy off at zero and requires a positive amount when enabled", async () => {
    render(<AdminSettingsPage />);

    const toggle = await screen.findByRole("switch", {
      name: "Require a refundable deposit for extra batteries",
    });
    const amount = screen.getByRole("spinbutton", { name: "Extra-battery deposit (€)" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(amount).toBeDisabled();
    expect(amount).toHaveValue(0);

    fireEvent.click(toggle);
    expect(amount).toBeEnabled();
    expect(screen.getByText("Enter a positive deposit amount before saving.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save settings" })).toBeDisabled();

    fireEvent.change(amount, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(settingsApi.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          extraBatteryDepositEnabled: true,
          extraBatteryDepositAmount: 150,
        }),
      ),
    );
  });

  it("resets a configured amount when disabled and requires a new amount if re-enabled", async () => {
    settingsApi.getSettings.mockResolvedValue({
      ...baseSettings,
      extraBatteryDepositEnabled: true,
      extraBatteryDepositAmount: 150,
    });
    render(<AdminSettingsPage />);

    const toggle = await screen.findByRole("switch", {
      name: "Require a refundable deposit for extra batteries",
    });
    const amount = screen.getByRole("spinbutton", { name: "Extra-battery deposit (€)" });
    expect(amount).toHaveValue(150);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(amount).toBeDisabled();
    expect(amount).toHaveValue(0);
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(settingsApi.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          extraBatteryDepositEnabled: false,
          extraBatteryDepositAmount: 0,
        }),
      ),
    );

    fireEvent.click(toggle);
    expect(amount).toBeEnabled();
    expect(amount).toHaveValue(0);
    expect(screen.getByText("Enter a positive deposit amount before saving.")).toBeInTheDocument();
  });

  it("shows server validation without clearing the operator's values", async () => {
    settingsApi.getSettings.mockResolvedValue({
      ...baseSettings,
      extraBatteryDepositEnabled: true,
      extraBatteryDepositAmount: 150,
    });
    settingsApi.updateSettings.mockRejectedValue(
      new SettingsApiError("Extra-battery deposit amount must be positive.", 400),
    );
    render(<AdminSettingsPage />);

    const amount = await screen.findByRole("spinbutton", {
      name: "Extra-battery deposit (€)",
    });
    fireEvent.change(amount, { target: { value: "175" } });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Extra-battery deposit amount must be positive.")).toBeInTheDocument();
    expect(amount).toHaveValue(175);
  });
});
