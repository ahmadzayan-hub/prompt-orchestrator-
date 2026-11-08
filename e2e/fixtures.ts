import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";

interface Membership { role: string; org: { id: string; slug: string } }
export interface Actor { page: Page; orgId: string }

export async function memberships(page: Page): Promise<Membership[]> {
  const response = await page.request.get("/api/orgs");
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.memberships;
}

export async function signIn(page: Page): Promise<Actor> {
  const mailbox = `browser-${randomUUID()}`;
  const email = `${mailbox}@example.test`;
  await page.goto("/login");
  const loginUrl = page.url();
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: "Send magic link", exact: true }).click();
  await expect(page.getByText("Check your inbox.", { exact: true })).toBeVisible();

  // Read only this test's mailbox from the disposable mail catcher. Neither
  // tokens nor storage state are written to source files or test attachments.
  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await page.request.get(`http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (!response.ok()) return false;
    const { messages } = await response.json();
    messageId = messages[0]?.ID;
    return Boolean(messageId);
  }, { message: "The local mail catcher should receive the sign-in message" }).toBe(true);
  const response = await page.request.get(`http://127.0.0.1:55424/api/v1/message/${messageId}`);
  expect(response.status()).toBe(200);
  const message = await response.json();
  expect(message.To.map((recipient: { Address: string }) => recipient.Address)).toContain(email);
  const html: string = message.HTML;
  const href = html.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1]?.replaceAll("&amp;", "&");
  if (!href || new URL(href).origin !== "http://127.0.0.1:55421") {
    throw new Error("Expected a sign-in link for the disposable Auth service");
  }
  await page.goto(href);
  await expect(page).toHaveURL(new URL("/workspace", loginUrl).href);
  await page.getByRole("dialog").getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const rows = await memberships(page);
  expect(rows).toHaveLength(1);
  expect(rows[0].role).toBe("owner");
  return { page, orgId: rows[0].org.id };
}

export class WorkspacePage {
  constructor(private page: Page) {}

  async createPrompt(prompt: string, quick = true) {
    await this.page.getByLabel("Raw prompt", { exact: true }).fill(prompt);
    const responsePromise = this.page.waitForResponse(response =>
      new URL(response.url()).pathname === "/api/sessions" && response.request().method() === "POST"
    );
    await this.page.getByRole("button", { name: quick ? /Quick enhance/ : "Start with questions" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200); // Local-engine fallback must never satisfy this test.
    const { session } = await response.json();
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(session.target_model).toBe("chatgpt"); // Default GPT-5 picker maps to its API family.
    return session as { id: string; status: string };
  }

  async answerAndFinalize() {
    await this.page.getByLabel("Who is the audience?", { exact: true }).fill("The synthetic engineering team");
    const responsePromise = this.page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith("/finalize") && response.request().method() === "POST"
    );
    await this.page.getByRole("button", { name: "Generate final prompt", exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const { version } = await response.json();
    expect(version.final_prompt).toContain("Synthetic browser acceptance");
    // Comparison cards also have Copy buttons. Target the actual final result
    // and require the server-returned text to render before leaving the page.
    const result = this.page.getByRole("region", { name: "Final prompt", exact: true });
    await expect(result.getByRole("button", { name: "Copy", exact: true })).toBeVisible();
    await expect(result.getByText(version.final_prompt, { exact: true })).toBeVisible();
    return version.final_prompt as string;
  }
}

export const test = base.extend<{ actor: Actor }>({
  actor: async ({ page }, use) => {
    await use(await signIn(page));
  }
});
export { expect };
