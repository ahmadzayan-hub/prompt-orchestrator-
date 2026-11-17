import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // Keep compiler checks enabled for new code; existing browser hydration
    // exceptions are documented at their exact call sites.
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/immutability": "error"
    }
  },
  {
    // Playwright fixtures name their callback `use`, which is not a React hook.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" }
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"])
]);
