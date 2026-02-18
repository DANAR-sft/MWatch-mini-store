import { createClient } from "../lib/supabase/server";
import { redirect } from "next/navigation";
import type { IAuthUser } from "@/types/definitions";

export async function signUpNewUser(
  name: string,
  email: string,
  password: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: { display_name: name },
    },
  });

  if (error) {
    redirect("/auth/register?message=" + encodeURIComponent(error.message));
  }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    redirect("/auth/login?message=" + encodeURIComponent(error.message));
  }
}

export async function signInWithGoogle(): Promise<string | null> {
  const supabase = await createClient();

  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    : "http://localhost:3000/auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("Google OAuth error:", error.message);
    throw new Error(error.message);
  }

  // Return the OAuth URL for client to redirect
  return data.url || null;
}

export async function signOutUser() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/?message=" + encodeURIComponent(error.message));
  }

  redirect("/auth/login");
}

export async function getCurrentUser() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.log("Error fetching user:", error.message);
  }

  if (!data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? "",
  } satisfies IAuthUser;
}
