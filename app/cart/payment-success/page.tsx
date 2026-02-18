"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  actionGetCurrentOrderStatus,
  actionMarkOrderCompleted,
} from "@/actions/orderAction";
import { IOrderStatus } from "@/types/definitions";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";
import { useAuth } from "@/lib/store/hookZustand";

function Checkout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? "";
  const [status, setStatus] = useState<IOrderStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const { user, fetchUser } = useAuth();

  // Use refs to track if we've already checked status and broadcasted
  const hasCheckedStatus = useRef(false);
  const hasBroadcasted = useRef(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    // Only run once per orderId
    if (hasCheckedStatus.current || !orderId) {
      if (!orderId) setIsLoadingStatus(false);
      return;
    }

    async function loadStatus() {
      hasCheckedStatus.current = true;

      try {
        const nextStatus = await actionGetCurrentOrderStatus(orderId);
        setStatus(nextStatus as IOrderStatus | null);

        // Redirect to appropriate page based on actual status
        if (nextStatus === "pending") {
          router.replace(`/cart/payment-pending?order_id=${orderId}`);
          return;
        } else if (nextStatus === "failed") {
          router.replace(`/cart/payment-failed?order_id=${orderId}`);
          return;
        }

        setIsLoadingStatus(false);
      } catch (error) {
        console.error(error);
        setIsLoadingStatus(false);
      }
    }

    loadStatus();
  }, [orderId, router]);

  // Separate effect for broadcasting - only runs when we have user and paid status
  useEffect(() => {
    // Debug log untuk troubleshooting
    console.log("[PaymentSuccess] Broadcast check:", {
      user: !!user,
      userId: user?.id,
      status,
      hasBroadcasted: hasBroadcasted.current,
      orderId,
    });

    if (!user || !status || status !== "paid" || hasBroadcasted.current) {
      return;
    }

    hasBroadcasted.current = true;
    console.log("[PaymentSuccess] Broadcasting ORDER_PAID event...");

    async function doBroadcast() {
      try {
        // Broadcast order paid event for admin dashboard
        await broadcast(CHANNELS.ORDERS, EVENTS.ORDER_PAID, {
          orderId,
          userId: user!.id,
          status: "paid",
        });
        console.log("[PaymentSuccess] ✓ ORDER_PAID broadcast sent");

        // Broadcast stock update for product pages
        await broadcast(CHANNELS.PRODUCTS, EVENTS.STOCK_UPDATED, {
          orderId,
        });
        console.log("[PaymentSuccess] ✓ STOCK_UPDATED broadcast sent");
      } catch (err) {
        console.warn("[Realtime] broadcast failed:", err);
        // Reset flag so it can retry
        hasBroadcasted.current = false;
      }
    }

    doBroadcast();
  }, [user, status, orderId]);

  async function handleCompleteOrder() {
    if (!orderId) return;
    setIsCompleting(true);

    try {
      await actionMarkOrderCompleted(orderId);
      setStatus("completed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyelesaikan pesanan";
      alert(message);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-linear-to-b from-green-50 to-white py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-2xl border-2 border-green-200 p-8 md:p-12 text-center mb-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
                <div className="relative bg-green-500 rounded-full p-4 shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Status Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Thank you for your purchase. Your order has been confirmed and is
              being processed.
            </p>

            {/* Order ID */}
            {orderId && (
              <div className="bg-slate-50 rounded-lg p-4 mb-8 border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Order ID</p>
                <p className="text-2xl font-bold text-black font-mono">
                  {orderId}
                </p>
              </div>
            )}

            {/* Order Status */}
            <div className="space-y-4 mb-8">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <p className="text-slate-600 font-medium">
                    Loading order status...
                  </p>
                </div>
              ) : (
                <>
                  <div className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold">
                    Status: {status || "Processing"}
                  </div>

                  {status === "shipped" && (
                    <div className="mt-6">
                      <p className="text-slate-600 mb-4">
                        Your order is on the way!
                      </p>
                      <button
                        onClick={handleCompleteOrder}
                        disabled={isCompleting}
                        className="inline-flex items-center px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isCompleting ? "Processing..." : "Confirm Receipt"}
                      </button>
                    </div>
                  )}

                  {status === "completed" && (
                    <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg font-semibold">
                      ✓ Order completed. Thank you for shopping with us!
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded text-left mb-8">
              <p className="text-sm text-slate-700">
                <strong>Next Steps:</strong> You will receive an email
                confirmation shortly. Track your order status in your account
                dashboard.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/orders"
                className="flex items-center justify-center px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 transition-all duration-300 hover:shadow-lg gap-2"
              >
                <Package className="w-5 h-5" />
                View Orders
              </Link>
              <Link
                href="/products"
                className="flex items-center justify-center px-8 py-3 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition-all duration-300 gap-2"
              >
                Continue Shopping
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-8">
              Order Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <div className="w-0.5 h-16 bg-slate-200 mt-2"></div>
                </div>
                <div className="pb-4">
                  <p className="font-bold text-black">Payment Confirmed</p>
                  <p className="text-sm text-slate-600">Today</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-white text-sm font-bold"></div>
                  <div className="w-0.5 h-16 bg-slate-200 mt-2"></div>
                </div>
                <div className="pb-4">
                  <p className="font-bold text-slate-900">Processing Order</p>
                  <p className="text-sm text-slate-600">Within 24 hours</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-white text-sm font-bold"></div>
                  <div className="w-0.5 h-16 bg-slate-200 mt-2"></div>
                </div>
                <div className="pb-4">
                  <p className="font-bold text-slate-900">Ready to Ship</p>
                  <p className="text-sm text-slate-600">2-3 days</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-white text-sm font-bold"></div>
                </div>
                <div>
                  <p className="font-bold text-slate-900">On the Way</p>
                  <p className="text-sm text-slate-600">3-5 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
            <h3 className="text-xl font-bold mb-3">Need Help?</h3>
            <p className="text-slate-300 mb-6">
              If you have any questions about your order, please contact our
              support team.
            </p>
            <button className="inline-flex items-center px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-100 transition-all duration-300">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Checkout />
    </Suspense>
  );
}
