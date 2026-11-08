import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth: { exchangeCodeForSession } })
}));

describe("magic-link callback redirects", () => {
  beforeEach(() => exchangeCodeForSession.mockReset());

  it("keeps a successful login on the browser origin, ignoring internal hosts and next URLs", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new NextRequest(
      "http://localhost:3100/auth/callback?code=synthetic-code&next=https://example.com",
      { headers: { host: "127.0.0.1:3100" } }
    ));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("synthetic-code");
    expect(response.status).toBe(307);
    const location = response.headers.get("location")!;
    expect(location).toBe("/workspace");
    expect(new URL(location, "http://127.0.0.1:3100/auth/callback").href)
      .toBe("http://127.0.0.1:3100/workspace");
  });

  it("returns failed exchanges to the same-origin retry page", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("Invalid code") });
    const response = await GET(new NextRequest("http://localhost:3100/auth/callback?code=invalid"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/login?error=invalid_link");
  });

  it("does not exchange a missing code or follow a supplied redirect", async () => {
    const response = await GET(new NextRequest("http://localhost:3100/auth/callback?next=https://example.com"));

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/login?error=invalid_link");
  });
});
