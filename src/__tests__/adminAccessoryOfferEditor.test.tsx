import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAccessory } from "@/services/adminCatalogService";

const catalog = vi.hoisted(() => ({
  getAccessories: vi.fn(),
  createAccessory: vi.fn(),
  updateAccessory: vi.fn(),
  deleteAccessory: vi.fn(),
  getCities: vi.fn(),
  getFaqs: vi.fn(),
  getMarquee: vi.fn(),
}));
const adminAuth = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/components/admin/AdminAuth", () => ({
  useAdminAuth: () => ({ authenticated: true, ready: true, signOut: adminAuth.signOut }),
}));
vi.mock("@/components/admin/useAdminRefresh", () => ({ useAdminRefresh: vi.fn() }));
vi.mock("@/services/adminCatalogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/adminCatalogService")>();
  return { ...actual, ...catalog };
});

import AdminContentPage from "@/app/[locale]/admin/content/page";
import { CatalogApiError } from "@/services/adminCatalogService";

function accessory(overrides: Partial<AdminAccessory>): AdminAccessory {
  return {
    id: "lock",
    name: "Heavy-duty lock",
    nameLocalized: {},
    description: null,
    descriptionLocalized: {},
    price: "€10 / 30d",
    price30: 10,
    price6mo: 10,
    price12mo: 10,
    isBundle: false,
    componentIds: [],
    icon: "lock",
    sortOrder: 1,
    colors: [],
    isActive: true,
    customerOfferPlacement: "hidden",
    isRecommended: false,
    benefit: "",
    benefitLocalized: {},
    inventoryTracked: true,
    replacementValue: 45,
    compareAtOfferCodes: [],
    ...overrides,
  };
}

const rows: AdminAccessory[] = [
  accessory({ id: "lock", name: "Heavy-duty lock", replacementValue: 45 }),
  accessory({ id: "phone", name: "Phone holder", icon: "phone", replacementValue: 25 }),
  accessory({
    id: "battery",
    name: "Battery Only",
    icon: "battery",
    customerOfferPlacement: "secondary",
    price30: 60,
    price6mo: 60,
    price12mo: 60,
    replacementValue: 300,
  }),
  accessory({
    id: "security-kit",
    name: "Courier Essentials",
    icon: "lock",
    customerOfferPlacement: "primary",
    benefit: "Secure the bike and keep navigation visible.",
    isBundle: true,
    inventoryTracked: false,
    replacementValue: 0,
    componentIds: ["lock", "phone"],
    price30: 60,
    price6mo: 30,
    price12mo: 30,
  }),
  accessory({
    id: "courier-pro",
    name: "Courier Pro",
    icon: "battery",
    customerOfferPlacement: "primary",
    isRecommended: true,
    benefit: "Extra shift flexibility with the essential setup.",
    benefitLocalized: { et: "Vahetuseks valmis varustus." },
    isBundle: true,
    inventoryTracked: false,
    replacementValue: 0,
    componentIds: ["battery", "lock", "phone"],
    compareAtOfferCodes: ["security-kit", "battery"],
    price30: 109,
    price6mo: 79,
    price12mo: 79,
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  catalog.getAccessories.mockResolvedValue(rows);
  catalog.getCities.mockResolvedValue([]);
  catalog.getFaqs.mockResolvedValue([]);
  catalog.getMarquee.mockResolvedValue({});
  catalog.updateAccessory.mockImplementation(async (_id: string, value: AdminAccessory) => value);
  catalog.createAccessory.mockImplementation(async (value: AdminAccessory) => value);
});

async function openCourierPro() {
  render(<AdminContentPage />);
  const name = await screen.findByText("Courier Pro");
  const row = name.closest("tr");
  if (!row) throw new Error("Courier Pro table row was not rendered.");
  fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
  return screen.findByRole("dialog", { name: "Edit accessory" });
}

describe("admin accessory offer editor", () => {
  it("round-trips placement, recommendation, benefit, inventory, value, and comparison offers", async () => {
    const dialog = await openCourierPro();

    expect(within(dialog).getByRole("combobox", { name: "Customer placement" })).toHaveValue(
      "primary",
    );
    expect(within(dialog).getByRole("checkbox", { name: "Active" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Recommended offer" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Track physical units" })).toBeDisabled();
    expect(within(dialog).getByRole("spinbutton", { name: "Replacement value (€)" })).toHaveValue(0);
    expect(within(dialog).getByRole("textbox", { name: "Benefit (EN)" })).toHaveValue(
      "Extra shift flexibility with the essential setup.",
    );
    expect(within(dialog).getByRole("checkbox", { name: /Courier Essentials.*compare/i })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: /Battery Only.*compare/i })).toBeChecked();

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Benefit (EN)" }), {
      target: { value: "Everything needed for a courier shift." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(catalog.updateAccessory).toHaveBeenCalledWith(
        "courier-pro",
        expect.objectContaining({
          customerOfferPlacement: "primary",
          isRecommended: true,
          benefit: "Everything needed for a courier shift.",
          benefitLocalized: { et: "Vahetuseks valmis varustus." },
          inventoryTracked: false,
          replacementValue: 0,
          compareAtOfferCodes: ["security-kit", "battery"],
        }),
      ),
    );
  });

  it("disables recommendation for hidden rows and warns when Courier Pro is not cheaper", async () => {
    const dialog = await openCourierPro();
    const placement = within(dialog).getByRole("combobox", { name: "Customer placement" });
    const recommended = within(dialog).getByRole("checkbox", { name: "Recommended offer" });

    fireEvent.change(placement, { target: { value: "hidden" } });
    expect(recommended).not.toBeChecked();
    expect(recommended).toBeDisabled();

    fireEvent.change(placement, { target: { value: "primary" } });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "12-month (p365)" }), {
      target: { value: "95" },
    });
    expect(
      within(dialog).getByText(/Courier Pro is not cheaper than its comparison offers on the 12-month tier/i),
    ).toBeInTheDocument();
  });

  it("rejects an active visible bundle with no components and surfaces server validation", async () => {
    render(<AdminContentPage />);
    await screen.findByText("Courier Pro");
    fireEvent.click(screen.getByRole("button", { name: /add accessory/i }));
    const dialog = await screen.findByRole("dialog", { name: "New accessory" });

    fireEvent.change(within(dialog).getByRole("textbox", { name: "Id" }), {
      target: { value: "new-package" },
    });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /Name \(EN base/i }), {
      target: { value: "New package" },
    });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "This accessory is a bundle" }));
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Customer placement" }), {
      target: { value: "primary" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(
      within(dialog).getByText("An active customer bundle must include at least one component."),
    ).toBeInTheDocument();
    expect(catalog.createAccessory).not.toHaveBeenCalled();

    catalog.createAccessory.mockRejectedValueOnce(
      new CatalogApiError("Comparison offers cannot reference this package.", 400),
    );
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Heavy-duty lock/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
    expect(
      await within(dialog).findByText("Comparison offers cannot reference this package."),
    ).toBeInTheDocument();
  });
});
