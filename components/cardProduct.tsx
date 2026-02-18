import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { IProduct, IPostCartItems } from "@/types/definitions";
import { useCart, useAuth, useProfile } from "@/lib/store/hookZustand";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export function CardProduct({
  id,
  name,
  description,
  price,
  stock,
  image_url,
  category,
}: IProduct) {
  const { user } = useAuth();
  const { postToCart, fetchCart, cart } = useCart();
  const { profile } = useProfile();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    setIsAdding(true);
    if (!user) {
      toast.error("Please log in to add items to your cart.");
      return;
    }

    if (stock <= 0) {
      toast.error("Sorry, this product is out of stock.");
      return;
    }
    try {
      const latestCart = cart.length ? cart : await fetchCart(user.id);
      const cartId = latestCart?.[0]?.id;
      if (!cartId) {
        throw new Error("Cart not found for this user.");
      }

      const existingQuantity =
        latestCart?.[0]?.cart_items?.find((ci) => ci.product_id === id)
          ?.quantity ?? 0;

      const cartItem: IPostCartItems = {
        cart_id: cartId,
        product_id: id,
        quantity: existingQuantity + 1,
      };

      await postToCart(cartItem);
      await fetchCart(user.id);
      toast.success("Item added to cart successfully!");
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="relative w-full h-100 max-w-sm pt-0">
      <Link href={`/products/detail-product/${id}`}>
        <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
        <img
          src={Array.isArray(image_url) ? image_url[0] : image_url}
          alt={name}
          className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40"
        />
      </Link>
      <CardHeader>
        <CardAction>
          <Badge variant="secondary">{category}</Badge>
        </CardAction>
        <CardTitle>{name}</CardTitle>
        <CardDescription className="md:h-10 overflow-hidden">
          {description}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <CardDescription>Rp{formatIDR(price)}</CardDescription>
        {profile?.role !== "admin" ? (
          <Button
            className="w-fit"
            onClick={handleAddToCart}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : "add to cart"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
