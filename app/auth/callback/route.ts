import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the user info and upsert profile
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const user = userData.user;
        const adminClient = createAdminClient();

        // Upsert profile with Google account data
        await adminClient.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            role: "user",
          },
          { onConflict: "id" },
        );
      }

      // Determine the redirect base URL
      // Priority: NEXT_PUBLIC_SITE_URL > x-forwarded-host > origin
      const forwardedHost = request.headers.get("x-forwarded-host");
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

      let redirectBase: string;
      if (siteUrl) {
        // Use configured site URL (ngrok URL)
        redirectBase = siteUrl;
      } else if (forwardedHost) {
        // Use forwarded host from reverse proxy
        redirectBase = `https://${forwardedHost}`;
      } else {
        // Fallback to origin
        redirectBase = origin;
      }

      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  // return the user to an error page with instructions
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const errorRedirect = siteUrl
    ? `${siteUrl}/auth/auth-code-error`
    : `${origin}/auth/auth-code-error`;
  return NextResponse.redirect(errorRedirect);
}
