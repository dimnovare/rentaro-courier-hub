import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("portal repair action layout", () => {
  it("allows long localized repair text to wrap without shrinking the arrow", () => {
    const component = readFileSync(
      resolve(process.cwd(), "src/app/[locale]/my-rental/ManageRental.tsx"),
      "utf8",
    );
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(component).toContain(
      'className="btn btn-primary btn-block portal-repair-submit"',
    );
    expect(css).toMatch(
      /\.portal-rental \.portal-repair-submit\s*\{[^}]*white-space:\s*normal;[^}]*min-width:\s*0;/,
    );
    expect(css).toMatch(
      /\.portal-rental \.portal-repair-submit \.arrow\s*\{[^}]*flex:\s*0 0 auto;/,
    );
  });
});
