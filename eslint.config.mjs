import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // eslint-plugin-react-hooks 7 (shipped with eslint-config-next 16) adds
    // React Compiler rules. Existing code reads localStorage in effects after
    // mount; rewriting that is a behaviour change, so these report as warnings
    // until a dedicated follow-up. New rules do not weaken rules-of-hooks.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn"
    }
  },
  {
    // Playwright fixtures name their callback `use`, which is not a React hook.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" }
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"])
]);
