"use server";
import { getProfileById } from "../services/profiles";
import { IProfile } from "../types/definitions";

export async function actionProfileById(id: string): Promise<IProfile | null> {
  return await getProfileById(id);
}
