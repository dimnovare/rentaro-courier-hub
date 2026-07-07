import { API_BASE } from "@/services/api";
import type { SiteSettings } from "@/types/settings";

// One canonical SiteSettings lives in @/types/settings; re-export so existing
// `import { SiteSettings } from "@/services/settingsService"` consumers keep working.
export type { SiteSettings };

/** Hidden-by-default fail-safe returned on any error / missing API_BASE. */
export const SAFE_DEFAULT_SETTINGS: SiteSettings = {
  showAccessories: false,
  showReferralCode: false,
  showAddGear: false,
  showReferAcourier: false,
  showPayConfirm: false,
  showOnlineSigning: false,
  // Fail-safe ON: preserve auto-send when the API is unreachable (opposite of the show* flags).
  autoSendReturnReminders: true,
  bankIban: "",
  bankAccountName: "",
  bankName: "",
  bankReference: "",
};

/**
 * Fetch site settings (SSR). Returns SAFE_DEFAULT_SETTINGS on any error or when
 * the API base is not configured, so hidden-by-default is always the fallback.
 */
export async function getSettings(): Promise<SiteSettings> {
  if (!API_BASE) return SAFE_DEFAULT_SETTINGS;
  try {
    const res = await fetch(`${API_BASE}/api/public/settings`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GET /api/public/settings → ${res.status}`);
    const data = (await res.json()) as Partial<SiteSettings>;
    return { ...SAFE_DEFAULT_SETTINGS, ...data };
  } catch {
    return SAFE_DEFAULT_SETTINGS;
  }
}
