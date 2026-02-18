"use server";

import {
  signUpNewUser,
  signInWithEmail,
  signInWithGoogle,
  getCurrentUser,
  signOutUser,
} from "../services/authSupabase";
import { IRegisterForm, ILoginForm } from "@/types/definitions";

export async function actionRegisterUser(data: IRegisterForm) {
  const { name, email, password } = data;

  console.log(name, email, password);
  return await signUpNewUser(name, email, password);
}

export async function actionLoginUser(data: ILoginForm) {
  const { email, password } = data;

  console.log(email, password);
  return await signInWithEmail(email, password);
}

export async function actionSignOut() {
  return await signOutUser();
}

export async function actionGetCurrentUser() {
  return await getCurrentUser();
}

export async function actionSignInWithGoogle(): Promise<string | null> {
  return await signInWithGoogle();
}
