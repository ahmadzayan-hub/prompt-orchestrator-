import { describe, expect, it } from "vitest";
import { apiTargetModel } from "./api-target-model";

describe("workspace API model compatibility", () => {
  it.each([
    ["gpt-5", "chatgpt"],
    ["claude-opus-4-7", "claude"],
    ["generic", "generic"],
    ["copilot", "copilot"],
    ["gemini", "gemini"],
    ["chatgpt", "chatgpt"],
    ["claude", "claude"],
    ["sora-2", "generic"],
    ["unknown", "generic"]
  ])("maps %s to the supported %s API target", (model, expected) => {
    expect(apiTargetModel(model)).toBe(expected);
  });
});
