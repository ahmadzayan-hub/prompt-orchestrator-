import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/login?error=invalid_link";
  if (code) {
    const { error } = await getServerSupabase().auth.exchangeCodeForSession(code);
    if (!error) destination = "/workspace";
  }
  // A relative Location keeps the browser's origin (and its session cookies).
  // Next.js may reconstruct request.url with an internal hostname instead.
  // Both destinations are fixed; never use a caller-provided redirect URL.
  return new NextResponse(null, { status: 307, headers: { Location: destination } });
}
