import { getModel } from "./ai-models";
import type { TargetModel } from "./types";

/** The hosted formatter accepts families; the picker/local engine use model IDs. */
export function apiTargetModel(model: string): TargetModel {
  if (["chatgpt", "claude", "copilot", "gemini", "generic"].includes(model)) {
    return model as TargetModel;
  }
  switch (getModel(model)?.promptStyle) {
    case "openai-system": return "chatgpt";
    case "claude-xml": return "claude";
    case "code-comments": return "copilot";
    case "gemini-multimodal": return "gemini";
    default: return "generic";
  }
}
