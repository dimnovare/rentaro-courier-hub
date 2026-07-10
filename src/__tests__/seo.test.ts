import { afterEach, beforeEach, describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { buildOrganizationSchema } from "@/components/seo/JsonLd";
import { buildAlternates } from "@/i18n/alternates";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

describe("SEO hygiene", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it("uses rentaro.ee as the canonical production fallback", () => {
    const alternates = buildAlternates("en", "/cities/tallinn");

    expect(alternates.canonical).toBe("https://rentaro.ee/cities/tallinn");
    expect(alternates.languages.en).toBe("https://rentaro.ee/cities/tallinn");
    expect(alternates.languages.et).toBe("https://rentaro.ee/et/cities/tallinn");
    expect(alternates.languages["x-default"]).toBe("https://rentaro.ee/cities/tallinn");
  });

  it("points robots and sitemap alternates at rentaro.ee", () => {
    expect(robots().sitemap).toBe("https://rentaro.ee/sitemap.xml");

    const tallinn = sitemap().find((entry) => entry.url === "https://rentaro.ee/cities/tallinn");
    const languages = tallinn?.alternates?.languages as Record<string, string> | undefined;

    expect(languages?.en).toBe("https://rentaro.ee/cities/tallinn");
    expect(languages?.et).toBe("https://rentaro.ee/et/cities/tallinn");
    expect(languages?.["x-default"]).toBe("https://rentaro.ee/cities/tallinn");
  });

  it("uses rentaro.ee in organization structured data", () => {
    const organization = buildOrganizationSchema();

    expect(organization.url).toBe("https://rentaro.ee");
    expect(organization.logo).toBe("https://rentaro.ee/assets/logo-r.png");
  });

  it("does not market paid accessories as included in English snippets", () => {
    const snippets = [en.hero.lead, en.cityPage.meta.descriptionLive].join(" ").toLowerCase();

    expect(en.hero.lead).toContain("charger included");
    expect(en.hero.lead).toContain("optional paid add-ons");
    expect(snippets).not.toContain("extra-battery options included");
    expect(snippets).not.toMatch(/lock[^.]*included|included[^.]*lock/);
  });
});
