import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

// Use the actual repository config, not a copy of the intended policy.
const eslint = new ESLint();

describe("React compiler lint guardrails", () => {
  it("rejects a newly introduced synchronous effect update", async () => {
    const [result] = await eslint.lintText(`
      import { useEffect, useState } from "react";
      export function Probe() {
        const [value, setValue] = useState(0);
        useEffect(() => { setValue(1); }, []);
        return <div>{value}</div>;
      }
    `, { filePath: "src/components/LintPolicyProbe.tsx" });
    expect(result.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "react-hooks/set-state-in-effect", severity: 2 })
    ]));
  });

  it("rejects a newly introduced props mutation", async () => {
    const [result] = await eslint.lintText(`
      export function Probe({ item }: { item: { value: number } }) {
        item.value = 1;
        return <div>{item.value}</div>;
      }
    `, { filePath: "src/components/LintPolicyProbe.tsx" });
    expect(result.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: "react-hooks/immutability", severity: 2 })
    ]));
  });
});
