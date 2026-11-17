import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // eslint-plugin-react-hooks 7 (shipped with eslint-config-next 16) adds
    // React Compiler rules. The CI lint gate runs with --max-warnings=0 and the
    // old plugin did not enforce these, so they stay off here. 11 existing
    // sites (localStorage read after mount) trip set-state-in-effect and 2 trip
    // immutability. Re-enable them together with a dedicated refactor PR.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off"
    }
  },
  {
    // Playwright fixtures name their callback `use`, which is not a React hook.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" }
  },
  globalIgnores([".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"])
]);
