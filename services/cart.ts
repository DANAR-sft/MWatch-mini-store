import { createClient } from "@/lib/supabase/server";
import { ICartItem, IPostCartItems } from "@/types/definitions";

export async function getCartByUserId(
  userId: string,
): Promise<ICartItem[] | []> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carts")
    .select(
      `
    id,
    cart_items (
      id,
      product_id,
      quantity,
      products (
        id,
        name,
        price,
        image_url,
        stock
      )
    )
  `,
    )
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function postToCart(item: IPostCartItems) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .upsert(
      {
        cart_id: item.cart_id,
        product_id: item.product_id,
        quantity: item.quantity,
      },
      {
        onConflict: "cart_id, product_id",
      },
    )
    .select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function deleteCartItem(cartItemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId);
  if (error) {
    throw new Error(error.message);
  }
}
