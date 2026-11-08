import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await getServerSupabase().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/workspace", request.url));
  }
  // A fixed same-origin destination avoids accepting arbitrary redirect URLs.
  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
