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
      // We intentionally read browser storage (token / booking summary) in an
      // effect-then-setState pattern — it's hydration-safe (lazy init would
      // mismatch SSR). Keep the rule visible as a warning, not a build failure.
      "react-hooks/set-state-in-effect": "warn",
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
