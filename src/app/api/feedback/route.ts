import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

const Body = z.object({
  rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  session_id: z.string().uuid().nullish(),
  intent: z.string().max(40).nullish(),
  target_model: z.string().max(20).nullish(),
  locale: z.string().max(10).nullish(),
  raw_length: z.number().int().nonnegative().max(1_000_000).nullish(),
  final_length: z.number().int().nonnegative().max(1_000_000).nullish(),
  comment: z.string().max(2000).nullish()
});

/**
 * Public-trial feedback endpoint.
 *
 * - Anyone (anonymous or authenticated) can POST a rating.
 * - When Supabase is configured we persist the row.
 * - When it isn't, we log the signal and return 200 — the UI still gets a
 *   "thanks" so the user-facing flow never fails because of missing infra.
 *
 * Phase-1 trial uses the table to learn (in aggregate) which prompt patterns
 * land well for each intent / target model.
 */
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    const json = await req.json();
    const result = Body.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: "invalid_body", issues: result.error.flatten() },
        { status: 400 }
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Truncate UA so we don't store fingerprintable data — first 120 chars only.
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 120);

  if (!isSupabaseConfigured()) {
    // No backend — accept the signal silently so the user sees "Thanks!"
    // (Real-time learning kicks in once Supabase is wired up.)
    console.info("[feedback]", {
      rating: parsed.rating,
      intent: parsed.intent ?? null,
      target_model: parsed.target_model ?? null,
      locale: parsed.locale ?? null
    });
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    let orgId: string | null = null;
    if (user) {
      const { data: u } = await supabase
        .from("users")
        .select("default_org_id")
        .eq("id", user.id)
        .maybeSingle();
      orgId = u?.default_org_id ?? null;
    }

    const { error } = await supabase.from("feedback").insert({
      org_id: orgId,
      user_id: user?.id ?? null,
      session_id: parsed.session_id ?? null,
      rating: parsed.rating,
      intent: parsed.intent ?? null,
      target_model: parsed.target_model ?? null,
      locale: parsed.locale ?? null,
      raw_length: parsed.raw_length ?? null,
      final_length: parsed.final_length ?? null,
      comment: parsed.comment ?? null,
      ua
    });

    if (error) {
      console.warn("[feedback] insert_failed:", error.message);
      // Still return 200 — the signal isn't worth blocking the UI on.
      return NextResponse.json({ ok: true, persisted: false });
    }
    return NextResponse.json({ ok: true, persisted: true });
  } catch (e) {
    console.warn("[feedback] error:", (e as Error).message);
    return NextResponse.json({ ok: true, persisted: false });
  }
}
