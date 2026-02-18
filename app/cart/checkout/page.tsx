"use client";

import { Navbar } from "@/components/navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCart, useAuth, useProfile } from "@/lib/store/hookZustand";
import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/utils";
import {
  ChevronRight,
  Shield,
  MapPin,
  Truck,
  Gift,
  CreditCard,
  FileText,
  ShoppingBag,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";

interface CheckoutFormData {
  full_name: string;
  address: string;
  shipping_method?: "standard" | "express";
  phone: string;
  email: string;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { cart, fetchCart } = useCart();
  const { user, fetchUser } = useAuth();
  const { profile, fetchProfileById } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [snapReady, setSnapReady] = useState(false);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>({
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    address: "",
    phone: "",
    shipping_method: "standard",
  });

  useEffect(() => {
    fetchUser().then((data) => {
      if (data?.id) {
        fetchProfileById(data.id);
        fetchCart(data.id);
      }
    });
  }, [fetchUser, fetchProfileById, fetchCart]);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        full_name: profile.full_name,
        email: profile.email,
      }));
    }
  }, [profile]);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    const snapUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ??
      "https://app.sandbox.midtrans.com/snap/snap.js";

    if (!clientKey) {
      setSnapError("Midtrans client key is missing");
      return;
    }

    const scriptId = "midtrans-snap-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      setSnapReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = snapUrl;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);

    script.onload = () => setSnapReady(true);
    script.onerror = () =>
      setSnapError("Failed to load Midtrans payment script");

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const calculateTotals = () => {
    let subtotal = 0;
    if (cart && Array.isArray(cart) && cart.length > 0) {
      const cartItem = cart[0];
      if (cartItem?.cart_items) {
        subtotal = cartItem.cart_items.reduce((total, item) => {
          const product = Array.isArray(item.products)
            ? item.products[0]
            : item.products;
          return total + (product?.price || 0) * item.quantity;
        }, 0);
      }
    }
    const shipping = formData.shipping_method === "express" ? 50000 : 20000;
    const total = subtotal + shipping;
    return { subtotal, shipping, total };
  };

  const { subtotal, shipping, total } = calculateTotals();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  async function handleCheckout() {
    if (!formData.full_name || !formData.address || !formData.phone) {
      toast.error("Harap isi semua data pengiriman");
      return;
    }

    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/auth/login");
      return;
    }

    if (snapError || !snapReady || !window.snap) {
      toast.error("Payment gateway belum siap. Coba lagi sebentar.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/midtrans/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          shipping_address: formData.address,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          shipping_method: formData.shipping_method,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const rawBody = await response.text();
      const data = contentType.includes("application/json")
        ? (JSON.parse(rawBody) as Record<string, unknown>)
        : null;

      if (!response.ok) {
        const message =
          (data?.message as string | undefined) ||
          (data?.error as string | undefined) ||
          (rawBody ? rawBody.slice(0, 200) : "Unknown error");
        toast.error("Error during checkout: " + message);
        return;
      }

      if (!data) {
        toast.error("Checkout gagal: respons server bukan JSON");
        return;
      }

      const snapToken = data.snap_token as string | undefined;
      const orderId = data.order_id as string | undefined;

      if (!snapToken || !orderId) {
        toast.error("Data pembayaran tidak lengkap");
        return;
      }

      // Broadcast that a new order was created (before payment)
      broadcast(CHANNELS.ORDERS, EVENTS.ORDER_CREATED, {
        orderId,
        status: "pending",
      }).catch((err) =>
        console.warn("[Checkout] broadcast created failed:", err),
      );

      window.snap.pay(snapToken, {
        onSuccess: function (result: unknown) {
          console.log("Payment success:", result);
          toast.success("Pembayaran berhasil!");
          router.push(`/cart/payment-success?order_id=${orderId}`);
        },
        onPending: function (result: unknown) {
          console.log("Payment pending:", result);
          toast.info("Pembayaran pending, menunggu konfirmasi...");
          // Broadcast to admin that new order is pending
          broadcast(CHANNELS.ORDERS, EVENTS.ORDER_PENDING, {
            orderId,
            status: "pending",
          }).catch((err) =>
            console.warn("[Checkout] broadcast pending failed:", err),
          );
          router.push(`/cart/payment-pending?order_id=${orderId}`);
        },
        onError: function (result: unknown) {
          console.log("Payment error:", result);
          toast.error("Pembayaran gagal");
          router.push(`/cart/payment-failed?order_id=${orderId}`);
        },
        onClose: function () {
          toast.info("Anda menutup popup tanpa menyelesaikan pembayaran");
          // Redirect to pending page so user can resume payment later
          router.push(`/cart/payment-pending?order_id=${orderId}`);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout gagal";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-linear-to-b from-slate-50 to-white py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-black">
                Secure Checkout
              </h1>
            </div>
            <div className="w-20 h-1 bg-linear-to-r from-slate-400 to-slate-600"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side - Checkout Form */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Shipping Address */}
                <div className="bg-white rounded-xl p-6 md:p-8 border-2 border-slate-200 hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-lg">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-black">
                      Shipping Address
                    </h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Full Name
                      </label>
                      <Input
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Street, house no., city, province, postal code"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium text-slate-900 placeholder:text-slate-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Phone Number
                      </label>
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Email
                      </label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="bg-white rounded-xl p-6 md:p-8 border-2 border-slate-200 hover:border-slate-400 transition-all">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-lg">
                      <Truck className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold text-black">
                      Shipping Method
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center p-4 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition">
                      <input
                        type="radio"
                        name="shipping_method"
                        value="standard"
                        checked={formData.shipping_method === "standard"}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-black"
                      />
                      <span className="ml-4 flex-1">
                        <span className="font-bold text-slate-900">
                          Standard Shipping
                        </span>
                        <p className="text-sm text-slate-600 mt-1">
                          3-5 business days
                        </p>
                      </span>
                      <span className="font-bold text-black">Rp20.000</span>
                    </label>
                    <label className="flex items-center p-4 border-2 border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition">
                      <input
                        type="radio"
                        name="shipping_method"
                        value="express"
                        checked={formData.shipping_method === "express"}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-black"
                      />
                      <span className="ml-4 flex-1">
                        <span className="font-bold text-slate-900">
                          Express Shipping
                        </span>
                        <p className="text-sm text-slate-600 mt-1">
                          1-2 business days
                        </p>
                      </span>
                      <span className="font-bold text-black">Rp50.000</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 md:p-8 border-2 border-slate-200 sticky top-28 shadow-lg">
                <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6" />
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6 pb-6 border-b-2 border-slate-200 max-h-96 overflow-y-auto">
                  {cart && Array.isArray(cart) && cart.length > 0 ? (
                    cart[0]?.cart_items?.map((item) => {
                      const product = Array.isArray(item.products)
                        ? item.products[0]
                        : item.products;
                      return (
                        <div key={item.id} className="flex gap-4">
                          <div className="shrink-0 w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-300">
                            {product?.image_url && (
                              <img
                                src={
                                  Array.isArray(product.image_url)
                                    ? product.image_url[0]
                                    : product.image_url
                                }
                                alt={product?.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 line-clamp-2">
                              {product?.name}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Qty: {item.quantity}
                            </p>
                            <p className="text-sm font-bold text-black mt-2">
                              Rp{formatIDR(product?.price || 0)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-600 py-4 text-center">
                      No products in cart
                    </p>
                  )}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3 mb-6 pb-6 border-b-2 border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-bold text-slate-900">
                      Rp{formatIDR(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-bold text-slate-900">
                      Rp{formatIDR(shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-black">
                      Rp{formatIDR(total)}
                    </span>
                  </div>
                </div>

                {/* Payment Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isLoading || !snapReady}
                  className="w-full py-4 px-6 bg-black text-white font-bold text-lg rounded-lg hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {isLoading ? "Processing..." : "Pay Now"}
                </button>

                {/* Security Info */}
                <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-slate-600 font-medium">
                    Your payment is secure and encrypted
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
