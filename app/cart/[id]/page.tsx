"use client";

import { Navbar } from "@/components/navbar";
import { useEffect, Suspense, useMemo, useState } from "react";
import { useCart, useAuth } from "@/lib/store/hookZustand";
import { useParams, useRouter } from "next/navigation";
import { Trash2, ShoppingCart, ArrowLeft, ArrowRight } from "lucide-react";
import { formatIDR } from "@/lib/utils";
import Link from "next/link";

function Cart() {
  const router = useRouter();
  const param = useParams();
  const id = param.id as string;
  const { cart, fetchCart, deleteCartItem, updateQuantity } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingMap, setIsUpdatingMap] = useState<Record<string, boolean>>(
    {},
  );
  const [isDeletingMap, setIsDeletingMap] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (id) {
        await fetchCart(id);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [id, fetchCart]);

  const handleDeleteItem = async (cartItemId: string) => {
    if (!user) return;
    try {
      setIsDeletingMap((m) => ({ ...m, [cartItemId]: true }));
      await deleteCartItem(cartItemId, user.id);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item from cart. Please refresh and try again.");
    } finally {
      setIsDeletingMap((m) => ({ ...m, [cartItemId]: false }));
    }
  };

  const handleUpdateQuantity = async (
    cartId: string,
    productId: string,
    currentQuantity: number,
    direction: "increase" | "decrease",
    cartItemId: string,
  ) => {
    if (!user) return;
    const newQuantity =
      direction === "increase" ? currentQuantity + 1 : currentQuantity - 1;

    if (newQuantity <= 0) {
      handleDeleteItem(cartItemId);
      return;
    }

    try {
      setIsUpdatingMap((m) => ({ ...m, [cartItemId]: true }));
      await updateQuantity(cartId, productId, newQuantity, user.id);
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Failed to update quantity. Please refresh and try again.");
    } finally {
      setIsUpdatingMap((m) => ({ ...m, [cartItemId]: false }));
    }
  };

  const cartItems = useMemo(() => {
    const latestCartItems = cart[0]?.cart_items;
    const items = Array.isArray(latestCartItems) ? [...latestCartItems] : [];
    items.sort((a, b) => b.quantity - a.quantity);
    return items;
  }, [cart]);

  const subtotal = cartItems.reduce((total, item) => {
    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products;
    const price = product?.price || 0;
    return total + price * item.quantity;
  }, 0);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <div className="w-12 h-12 bg-linear-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading your cart...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-black transition mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shopping
            </button>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-lg">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-black">
                Your Cart
              </h1>
            </div>
            <div className="w-20 h-1 bg-linear-to-r from-slate-400 to-slate-600 mt-4"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-3">
              {cartItems.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-2xl font-bold text-slate-900 mb-2">
                    Your cart is empty
                  </p>
                  <p className="text-slate-600 mb-6">
                    Explore our collection and add some items
                  </p>
                  <Link href="/products">
                    <button className="inline-flex items-center px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 transition-all duration-300 hover:shadow-lg gap-2">
                      Continue Shopping
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const product = Array.isArray(item.products)
                      ? item.products[0]
                      : item.products;
                    const cartId = cart[0]?.id;

                    if (!product || !cartId) return null;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border-2 border-slate-200 hover:border-slate-400 p-4 md:p-6 transition-all hover:shadow-lg"
                      >
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                          {/* Product Image */}
                          <div className="shrink-0 w-full md:w-32 h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-300">
                            <img
                              src={
                                Array.isArray(product.image_url)
                                  ? product.image_url[0]
                                  : product.image_url
                              }
                              alt={product.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-lg md:text-xl text-black mb-2">
                                {product.name}
                              </h3>
                              <p className="text-2xl font-bold text-black">
                                Rp{formatIDR(product.price)}
                              </p>
                            </div>

                            {/* Quantity Control */}
                            <div className="flex items-center gap-3 mt-4  bg-slate-100 w-fit px-4 py-2 rounded-lg">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(
                                    cartId,
                                    item.product_id,
                                    item.quantity,
                                    "decrease",
                                    item.id,
                                  )
                                }
                                disabled={isUpdatingMap[item.id]}
                                className="text-slate-600 hover:text-black hover:cursor-pointer hover:scale-110 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-bold text-black">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  handleUpdateQuantity(
                                    cartId,
                                    item.product_id,
                                    item.quantity,
                                    "increase",
                                    item.id,
                                  );
                                }}
                                disabled={
                                  product.stock <= item.quantity ||
                                  isUpdatingMap[item.id]
                                }
                                className="text-slate-600 hover:text-black hover:cursor-pointer hover:scale-110 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Total Price and Delete */}
                          <div className="flex flex-col items-end justify-between md:w-fit">
                            <div className="text-right">
                              <p className="text-sm text-slate-600 mb-1">
                                Total
                              </p>
                              <p className="font-bold text-2xl text-black">
                                Rp{formatIDR(product.price * item.quantity)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={isDeletingMap[item.id]}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Summary */}
            {cartItems.length > 0 && (
              <div className="lg:col-span-1">
                <div className="bg-linear-to-b from-slate-50 to-white rounded-xl border-2 border-slate-200 p-6 md:p-8 sticky top-28 shadow-lg">
                  <h2 className="text-2xl font-bold text-black mb-8">
                    Order Summary
                  </h2>

                  <div className="space-y-4 mb-8 pb-8 border-b-2 border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Items</span>
                      <span className="font-bold text-slate-900">
                        {cartItems.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Name</span>
                      <span className="font-bold text-slate-900">
                        {cartItems
                          .map((item) => {
                            const product = Array.isArray(item.products)
                              ? item.products[0]
                              : item.products;
                            return product?.name.split(" ")[0] || "Unknown";
                          })
                          .join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax (10%)</span>
                      <span className="font-bold text-slate-900">
                        Rp{formatIDR(Math.floor(subtotal * 0.1))}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">Subtotal</span>
                      <span className="font-bold text-slate-900">
                        Rp{formatIDR(subtotal)}
                      </span>
                    </div>
                  </div>

                  <Link href="/cart/checkout">
                    <button
                      disabled={cartItems.length === 0}
                      className="w-full py-4 px-6 bg-black text-white font-bold text-lg rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      Proceed to Checkout
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </Link>

                  <p className="text-xs text-slate-6 text-center mt-4">
                    ✓ Free shipping on orders above Rp500.000
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <div className="w-12 h-12 bg-linear-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <Cart />
    </Suspense>
  );
}
