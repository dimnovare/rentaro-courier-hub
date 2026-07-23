import { afterEach, describe, expect, it } from "vitest";
import {
  buildWindDownRedirects,
  commercialRedirectPaths,
  isWindDownMode,
  WIND_DOWN_MODE,
  WIND_DOWN_PATH,
} from "@/lib/windDown";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

// Route classes from the frontend audit. KEEP-ACTIVE surfaces must NEVER be a
// redirect source, appear in the commercial path list, or leak into the source
// strings the config emits.
const KEEP_ACTIVE = [
  "/my-rental",
  "/feedback",
  "/booking/status",
  "/booking/success",
  "/admin",
  "/privacy",
  "/terms",
  "/rules",
  "/api",
];

const COMMERCIAL = [
  "/",
  "/models",
  "/models/:slug",
  "/pricing",
  "/accessories",
  "/how-it-works",
  "/cities/:city",
  "/book",
  "/faq",
  "/monthly-ebike-rental",
  "/delivery-ebike-rental",
  "/ebike-rental-for-couriers",
];

const ORIGINAL_MODE = process.env.NEXT_PUBLIC_BUSINESS_MODE;

function restoreMode() {
  if (ORIGINAL_MODE === undefined) {
    delete process.env.NEXT_PUBLIC_BUSINESS_MODE;
  } else {
    process.env.NEXT_PUBLIC_BUSINESS_MODE = ORIGINAL_MODE;
  }
}

describe("wind-down mode flag", () => {
  afterEach(restoreMode);

  it("only activates for the exact wind_down value", () => {
    expect(WIND_DOWN_MODE).toBe("wind_down");
    expect(isWindDownMode("wind_down")).toBe(true);
    expect(isWindDownMode(undefined)).toBe(false);
    expect(isWindDownMode("")).toBe(false);
    expect(isWindDownMode("winddown")).toBe(false);
    expect(isWindDownMode("normal")).toBe(false);
  });
});

describe("commercial redirect path list", () => {
  it("never lists a KEEP-ACTIVE route", () => {
    for (const path of commercialRedirectPaths) {
      for (const keep of KEEP_ACTIVE) {
        expect(path.startsWith(keep)).toBe(false);
      }
    }
    // /wind-down itself must never be a source (no redirect loop).
    expect(commercialRedirectPaths).not.toContain(WIND_DOWN_PATH);
  });
});

describe("buildWindDownRedirects", () => {
  it("returns no redirects when the flag is off", () => {
    expect(buildWindDownRedirects(undefined)).toEqual([]);
    expect(buildWindDownRedirects("normal")).toEqual([]);
    expect(buildWindDownRedirects("")).toEqual([]);
  });

  it("redirects every commercial route (en + locale-prefixed) to /wind-down", () => {
    const redirects = buildWindDownRedirects("wind_down");
    const sources = redirects.map((r) => r.source);

    // Two rules per commercial path: unprefixed + /:locale(et|lv|fi|ru)/…
    expect(redirects).toHaveLength(commercialRedirectPaths.length * 2);

    for (const path of COMMERCIAL) {
      expect(sources).toContain(path);
    }

    // Booking wizard is disabled by the redirect itself (not backend/mock data).
    expect(sources).toContain("/book");
    expect(sources).toContain("/:locale(et|lv|fi|ru)/book");

    // Root maps to the bare locale segment for the non-default locales.
    expect(sources).toContain("/");
    expect(sources).toContain("/:locale(et|lv|fi|ru)");

    // Dynamic model/city detail routes are covered.
    expect(sources).toContain("/models/:slug");
    expect(sources).toContain("/:locale(et|lv|fi|ru)/cities/:city");
  });

  it("uses temporary redirects that all target the wind-down notice", () => {
    const redirects = buildWindDownRedirects("wind_down");
    for (const r of redirects) {
      expect(r.permanent).toBe(false);
      expect([WIND_DOWN_PATH, `/:locale${WIND_DOWN_PATH}`]).toContain(r.destination);
    }
  });

  it("EXCLUDES every KEEP-ACTIVE route from the source set", () => {
    const sources = buildWindDownRedirects("wind_down").map((r) => r.source);
    for (const source of sources) {
      for (const keep of KEEP_ACTIVE) {
        expect(source.includes(keep)).toBe(false);
      }
      // Never redirect the notice onto itself.
      expect(source.includes(WIND_DOWN_PATH)).toBe(false);
    }
  });
});

describe("SEO surface gating", () => {
  afterEach(restoreMode);

  it("normal mode: sitemap lists commercial routes; robots does not block them", () => {
    delete process.env.NEXT_PUBLIC_BUSINESS_MODE;

    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/book"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/models"))).toBe(true);
    expect(urls.some((u) => /\/models\/.+/.test(u))).toBe(true);

    const disallow = robots().rules;
    const flat = Array.isArray(disallow) ? disallow : [disallow];
    const blocked = flat.flatMap((r) => r.disallow ?? []);
    expect(blocked).not.toContain("/book");
    expect(blocked).not.toContain("/models");
    expect(blocked).toContain("/admin");
  });

  it("wind_down mode: sitemap keeps only legal; robots blocks the commercial routes", () => {
    process.env.NEXT_PUBLIC_BUSINESS_MODE = "wind_down";

    const paths = sitemap().map((e) => new URL(e.url).pathname);
    expect(paths.sort()).toEqual(["/privacy", "/rules", "/terms"]);
    expect(paths).not.toContain("/");
    expect(paths).not.toContain("/book");
    expect(paths.some((p) => p.startsWith("/models/"))).toBe(false);
    expect(paths.some((p) => p.startsWith("/cities/"))).toBe(false);

    const disallow = robots().rules;
    const flat = Array.isArray(disallow) ? disallow : [disallow];
    const blocked = flat.flatMap((r) => r.disallow ?? []);
    expect(blocked).toContain("/book");
    expect(blocked).toContain("/models");
    expect(blocked).toContain("/et/book");
    // KEEP-ACTIVE stays blocked, legal stays crawlable.
    expect(blocked).toContain("/admin");
    expect(blocked).not.toContain("/privacy");
    expect(blocked).not.toContain("/");
  });
});
