"use client";

import { Navbar } from "@/components/navbar";
import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useProducts,
  useCart,
  useAuth,
  useProfile,
} from "@/lib/store/hookZustand";
import {
  subscribeToChannel,
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS,
} from "@/lib/supabase/realtime";
import { IProduct, IPostCartItems } from "@/types/definitions";
import { CardProduct } from "@/components/cardProduct";
import { formatIDR } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Heart,
  Share2,
  Check,
} from "lucide-react";
import { Toaster, toast } from "sonner";

function DetailProduct() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { productById, fetchProductById, products, fetchProducts } =
    useProducts();
  const { user, fetchUser } = useAuth();
  const { postToCart, fetchCart, cart } = useCart();
  const { profile } = useProfile();
  useEffect(() => {
    if (id) {
      fetchProductById(id as string);
    }
  }, [id, fetchProductById]);

  // Ensure currentImageIndex is valid when product images change
  useEffect(() => {
    const imgs = Array.isArray(productById?.image_url)
      ? productById!.image_url
      : [];
    if (imgs.length === 0) {
      setCurrentImageIndex(0);
      return;
    }
    if (currentImageIndex >= imgs.length) {
      setCurrentImageIndex(0);
    }
  }, [productById?.image_url, currentImageIndex]);

  // Realtime: listen for stock updates and product deletion for this product id
  useEffect(() => {
    if (!id) return;

    const channel = subscribeToChannel(
      CHANNELS.PRODUCTS,
      [EVENTS.STOCK_UPDATED, EVENTS.PRODUCT_DELETED],
      async (event, payload) => {
        try {
          const pid = payload.productId as string | undefined;
          if (!pid || pid !== id) return; // ignore other products

          console.log(
            "[DetailProduct] Realtime event received:",
            event,
            payload,
          );

          if (event === EVENTS.PRODUCT_DELETED) {
            // If product deleted, navigate back to products listing
            router.push("/products");
            return;
          }

          // For stock update, refresh product data
          await fetchProductById(id as string);
        } catch (err) {
          console.error("[DetailProduct] realtime handler error", err);
        }
      },
    );

    return () => {
      try {
        unsubscribeFromChannel(channel);
      } catch (err) {
        console.error("[DetailProduct] unsubscribe error", err);
      }
    };
  }, [id, fetchProductById, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please log in to add items to your cart.");
      router.push("/auth/login");
      return;
    }

    if (!productById) return;

    if (productById.stock <= 0) {
      toast.error("Sorry, this product is out of stock.");
      return;
    }

    setIsAdding(true);
    try {
      const latestCart = cart.length ? cart : await fetchCart(user.id);
      const cartId = latestCart?.[0]?.id;

      if (!cartId) {
        throw new Error("Cart not found for this user.");
      }

      const existingItem = latestCart?.[0]?.cart_items?.find(
        (ci) => ci.product_id === productById.id,
      );

      const existingQuantity = existingItem?.quantity ?? 0;

      // Check if adding the requested quantity exceeds stock
      if (existingQuantity + quantity > productById.stock) {
        toast.error(
          `Cannot add ${quantity} items. You already have ${existingQuantity} in cart and stock is ${productById.stock}.`,
        );
        return;
      }

      const cartItem: IPostCartItems = {
        cart_id: cartId,
        product_id: productById.id,
        quantity: existingQuantity + quantity,
      };

      await postToCart(cartItem);
      // Refresh cart to get updated state
      await fetchCart(user.id);

      setIsAdded(true);
      toast.success("Item added to cart successfully!");

      // Reset isAdded after a delay
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handlePrevImage = () => {
    if (productById && productById.image_url.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? productById.image_url.length - 1 : prev - 1,
      );
    }
  };

  const handleNextImage = () => {
    if (productById && productById.image_url.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === productById.image_url.length - 1 ? 0 : prev + 1,
      );
    }
  };

  if (!productById) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  const relatedProducts = products
    .filter((product: IProduct) => product.id !== productById.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      <Toaster />

      {/* Main Product Section */}
      <section className="w-full py-8 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Image Gallery */}
            <div className="flex flex-col gap-4">
              {/* Main Image */}
              <div className="relative w-full aspect-square bg-slate-100 rounded-xl overflow-hidden group">
                <img
                  src={productById.image_url[currentImageIndex]}
                  alt={`${productById.name} - ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />

                {/* Navigation Arrows */}
                {productById.image_url.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {productById.image_url.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                    {currentImageIndex + 1} / {productById.image_url.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {productById.image_url.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {productById.image_url.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all border-2 ${
                        currentImageIndex === index
                          ? "border-black scale-105 shadow-lg"
                          : "border-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-8">
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                      {productById.category}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight">
                      {productById.name}
                    </h1>
                  </div>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed">
                  {productById.description}
                </p>
              </div>

              {/* Price and Stock */}
              <div className="border-y border-slate-200 py-6 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-black">
                    Rp{formatIDR(productById.price)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      productById.stock > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {productById.stock > 0
                      ? `${productById.stock} in stock`
                      : "Out of stock"}
                  </div>
                </div>
              </div>

              {/* Quantity and Actions */}
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-900">
                    Quantity
                  </label>
                  <div className="flex items-center gap-4 bg-slate-100 w-fit px-4 py-3 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="text-slate-600 hover:text-black transition-colors"
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="font-bold text-lg w-8 text-center text-black">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(Math.min(productById.stock, quantity + 1))
                      }
                      className="text-slate-600 hover:text-black transition-colors"
                      disabled={quantity >= productById.stock}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                {profile?.role !== "admin" && (
                  <button
                    onClick={handleAddToCart}
                    disabled={!productById.stock || isAdding}
                    className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                      productById.stock > 0
                        ? "bg-black text-white hover:bg-slate-900 hover:shadow-lg hover:scale-105"
                        : "bg-slate-300 text-slate-600 cursor-not-allowed"
                    } ${isAdding ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {isAdding ? (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Adding...
                      </>
                    ) : isAdded ? (
                      <>
                        <Check className="w-5 h-5" />
                        Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </>
                    )}
                  </button>
                )}

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      isFavorited
                        ? "bg-red-100 text-red-600 border-2 border-red-300"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300"
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${isFavorited ? "fill-current" : ""}`}
                    />
                    <span className="hidden sm:inline">Wishlist</span>
                  </button>
                  <button className="py-3 px-4 rounded-lg font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Share2 className="w-5 h-5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Free Shipping</p>
                  <p className="font-semibold text-slate-900">
                    On orders above Rp500.000
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Secure Checkout</p>
                  <p className="font-semibold text-slate-900">
                    Powered by Midtrans
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="w-full bg-linear-to-b from-slate-50 to-white py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-3">
                You might also like
              </h2>
              <div className="w-16 h-1 bg-linear-to-r from-slate-400 to-slate-600 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product: IProduct, index: number) => (
                <div
                  key={product.id}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardProduct
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    image_url={product.image_url}
                    price={product.price}
                    stock={product.stock}
                    category={product.category}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function DetailProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <Navbar />
      <DetailProduct />
    </Suspense>
  );
}
