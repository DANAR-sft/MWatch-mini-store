"use server";

import { postToCart, getCartByUserId, deleteCartItem } from "@/services/cart";
import { ICartItem, IPostCartItems } from "@/types/definitions";

export async function actionGetCartByUserId(
  userId: string,
): Promise<ICartItem[] | []> {
  return await getCartByUserId(userId);
}

export async function actionPostToCart(
  item: IPostCartItems,
): Promise<ICartItem[] | []> {
  return (await postToCart(item)) ?? [];
}

export async function actionDeleteCartItem(cartItemId: string): Promise<void> {
  await deleteCartItem(cartItemId);
}
