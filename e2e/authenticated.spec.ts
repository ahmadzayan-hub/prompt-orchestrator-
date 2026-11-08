import { randomUUID } from "node:crypto";
import { test, expect, memberships, signIn, WorkspacePage } from "./fixtures";

test.describe("Disposable authenticated application", () => {
  test("anonymous browsers cannot read or create cloud data", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByText("No sessions yet.", { exact: true })).toBeVisible();
    for (const route of ["/api/orgs", "/api/sessions"]) {
      const read = await page.request.get(route);
      expect(read.status()).toBe(401);
      const write = await page.request.post(route, { data: {} });
      expect(write.status()).toBe(401);
    }
  });

  test("invalid or missing magic-link codes remain signed out with a retry message", async ({ page, baseURL }) => {
    for (const suffix of ["", "?code=invalid-code&next=https://example.com"]) {
      await page.goto(`/auth/callback${suffix}`);
      await expect(page).toHaveURL(new URL("/login?error=invalid_link", baseURL).href);
      await expect(page.getByRole("alert").filter({ hasText: "This sign-in link" }))
        .toHaveText("This sign-in link is invalid or expired. Request a new link.");
      const response = await page.request.get("/api/orgs");
      expect(response.status()).toBe(401);
    }
  });

  test("magic-link login persists a quick prompt across reload and a fresh browser context", async ({ actor, browser, baseURL }) => {
    const { page } = actor;
    const prompt = `Write a team update for acceptance ${randomUUID()}`;
    const session = await new WorkspacePage(page).createPrompt(prompt);
    expect(session.status).toBe("finalized");
    await page.goto("/history");
    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    // Copy only cookies: no localStorage/history entries can make this pass.
    const state = await page.context().storageState();
    const fresh = await browser.newContext({ baseURL, locale: "en-US", storageState: { cookies: state.cookies, origins: [] } });
    try {
      const restored = await fresh.newPage();
      await restored.goto("/history");
      await expect(restored.getByText(prompt, { exact: true })).toBeVisible();
      const detail = await restored.request.get(`/api/sessions/${session.id}`);
      expect(detail.status()).toBe(200);
      const body = await detail.json();
      expect(body.session.prompt_versions).toHaveLength(1);
      expect(body.session.prompt_versions[0].final_prompt).toContain("Synthetic browser acceptance");
    } finally {
      await fresh.close();
    }
  });

  test("clarification answers and the finalized version are stored on the backend", async ({ actor }) => {
    const prompt = `Write a release update ${randomUUID()}`;
    const workspace = new WorkspacePage(actor.page);
    const session = await workspace.createPrompt(prompt, false);
    expect(session.status).toBe("clarifying");
    const finalPrompt = await workspace.answerAndFinalize();
    await actor.page.reload();
    const response = await actor.page.request.get(`/api/sessions/${session.id}`);
    expect(response.status()).toBe(200);
    const { session: saved, answers } = await response.json();
    expect(saved.status).toBe("finalized");
    expect(saved.prompt_versions).toHaveLength(1);
    expect(saved.prompt_versions[0].final_prompt).toBe(finalPrompt);
    expect(answers).toHaveLength(1);
    expect(answers[0].answer).toBe("The synthetic engineering team");
    await actor.page.goto("/history");
    await expect(actor.page.getByText(prompt, { exact: true })).toBeVisible();
  });

  test("organization enrollment is atomic and a duplicate slug can be retried safely", async ({ actor }) => {
    const slug = `browser-${randomUUID()}`;
    const data = { name: "Synthetic browser organization", slug };
    const created = await actor.page.request.post("/api/orgs", { data });
    expect(created.status()).toBe(200);
    const { org } = await created.json();
    const duplicate = await actor.page.request.post("/api/orgs", { data });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toEqual({ error: "slug_taken" });
    const rows = await memberships(actor.page);
    expect(rows.filter(row => row.org.slug === slug)).toEqual([
      expect.objectContaining({ role: "owner", org: expect.objectContaining({ id: org.id }) })
    ]);
    const allowed = await actor.page.request.get("/api/sessions", { headers: { "x-org-id": org.id } });
    expect(allowed.status()).toBe(200);
  });

  test("two signed-in tenants cannot read, create or delete each other's sessions", async ({ actor, browser, baseURL }) => {
    const ownerPrompt = `Private first tenant prompt ${randomUUID()}`;
    const ownerSession = await new WorkspacePage(actor.page).createPrompt(ownerPrompt);
    const otherContext = await browser.newContext({ baseURL, locale: "en-US" });
    try {
      const other = await signIn(await otherContext.newPage());
      expect(other.orgId).not.toBe(actor.orgId);
      const otherPrompt = `Private second tenant prompt ${randomUUID()}`;
      await new WorkspacePage(other.page).createPrompt(otherPrompt);
      await other.page.goto("/history");
      await expect(other.page.getByText(otherPrompt, { exact: true })).toBeVisible();
      await expect(other.page.getByText(ownerPrompt, { exact: true })).toHaveCount(0);
      await actor.page.goto("/history");
      await expect(actor.page.getByText(ownerPrompt, { exact: true })).toBeVisible();
      await expect(actor.page.getByText(otherPrompt, { exact: true })).toHaveCount(0);
      const headers = { "x-org-id": actor.orgId };
      const forgedRead = await other.page.request.get("/api/sessions", { headers });
      expect(forgedRead.status()).toBe(403);
      const forgedWrite = await other.page.request.post("/api/sessions", { headers, data: { raw_prompt: "Foreign write", quick: true } });
      expect(forgedWrite.status()).toBe(403);
      const foreignRead = await other.page.request.get(`/api/sessions/${ownerSession.id}`);
      expect(foreignRead.status()).toBe(404);
      const foreignDelete = await other.page.request.delete(`/api/sessions/${ownerSession.id}`);
      expect(foreignDelete.status()).toBe(200); // Deliberately idempotent; must not delete the row.
      const intact = await actor.page.request.get(`/api/sessions/${ownerSession.id}`);
      expect(intact.status()).toBe(200);
      expect((await intact.json()).session.raw_prompt).toBe(ownerPrompt);
    } finally {
      await otherContext.close();
    }
  });
});
