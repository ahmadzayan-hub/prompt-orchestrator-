import { createServer } from "node:http";

// Only the external inference provider is simulated. Auth, SQL/RLS, PostgREST,
// Next routes and browser requests all run against the real application stack.
export async function startOllamaFixture() {
  const server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/generate") {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const { system = "" } = JSON.parse(body);
    let result;
    if (system.includes("You classify")) {
      result = { intent: "writing", confidence: 0.99 };
    } else if (system.includes("MISSING")) {
      result = { gaps: [{ slot: "audience", why: "Identify the reader" }] };
    } else if (system.includes("You generate clarification")) {
      result = { questions: [{ slot: "audience", question: "Who is the audience?", rationale: "Choose the reader", required: true }] };
    } else if (system.includes("rebuilding a polished")) {
      result = { final_prompt: "CONTEXT: Synthetic browser acceptance.\nOBJECTIVE: Write a concise team update.", rationale: "Deterministic test fixture; no real inference." };
    } else {
      res.writeHead(400).end("Unexpected inference request");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ response: JSON.stringify(result), done: true }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(55425, "127.0.0.1", resolve);
  });
  return server;
}
