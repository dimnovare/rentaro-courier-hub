import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The locked design sizes product/hero/gallery images via CSS
      // (.model-pic img { width: 84% } etc.), so we intentionally use <img>.
      "@next/next/no-img-element": "off",
      // The client-rendered admin + portal intentionally load data on mount and
      // read browser storage (token / booking summary) in an effect-then-setState
      // pattern — hydration-safe and correct for this SPA-style architecture (a
      // lazy init would mismatch SSR). The rule flags ~20 of these legitimate
      // load-on-mount/hydration effects, so it's disabled rather than refactoring
      // the whole client data layer. Re-enable to "warn" if stricter auditing is
      // wanted later.
      "react-hooks/set-state-in-effect": "off",
      // The booking wizard redirects to Montonio's hosted checkout via
      // window.location; the React-Compiler immutability rule flags that external
      // assignment. We're not on the compiler, so it's advisory here → warn.
      "react-hooks/immutability": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
