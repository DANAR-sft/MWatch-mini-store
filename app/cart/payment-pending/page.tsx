"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  subscribeToPostgresChannel,
  unsubscribeFromChannel,
} from "@/lib/supabase/realtime";
import {
  actionGetCurrentOrderStatus,
  actionCancelOrder,
} from "@/actions/orderAction";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, Home, XCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

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

export default function PaymentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [isResuming, setIsResuming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const canResume = Boolean(orderId);
  const hasRedirected = useRef(false);

  // Handle status change (used by both realtime and polling)
  const handleStatusChange = (status: string | undefined) => {
    if (hasRedirected.current) return;

    if (status === "paid") {
      hasRedirected.current = true;
      router.push(`/cart/payment-success?order_id=${orderId}`);
    } else if (status === "failed") {
      hasRedirected.current = true;
      router.push(`/cart/payment-failed?order_id=${orderId}`);
    }
  };

  // Realtime subscription (may fail due to RLS)
  useEffect(() => {
    if (!orderId) return;

    const channel = subscribeToPostgresChannel(
      `order-status-${orderId}`,
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        const status = (payload.new as { status?: string } | null)?.status;
        handleStatusChange(status);
      },
    );

    return () => {
      try {
        unsubscribeFromChannel(channel);
      } catch (err) {
        console.error("[PaymentPending] unsubscribe error", err);
      }
    };
  }, [orderId, router]);

  // Polling fallback - checks status every 3 seconds
  useEffect(() => {
    if (!orderId) return;

    const pollStatus = async () => {
      try {
        const status = await actionGetCurrentOrderStatus(orderId);
        handleStatusChange(status ?? undefined);
      } catch (err) {
        console.warn("[PaymentPending] poll error:", err);
      }
    };

    // Poll immediately on mount
    pollStatus();

    // Then poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [orderId, router]);

  async function handleResumePayment() {
    if (!orderId) {
      alert("Order ID tidak tersedia");
      return;
    }

    if (!window.snap) {
      alert("Midtrans Snap belum siap");
      return;
    }

    setIsResuming(true);
    try {
      const response = await fetch("/api/midtrans/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const contentType = response.headers.get("content-type") || "";
      const rawBody = await response.text();
      const data = contentType.includes("application/json")
        ? (JSON.parse(rawBody) as {
            snap_token?: string;
            error?: string;
            message?: string;
          })
        : null;

      if (!response.ok || !data?.snap_token) {
        const fallbackMessage = rawBody
          ? rawBody.slice(0, 200)
          : "Gagal melanjutkan pembayaran";
        alert(data?.message || data?.error || fallbackMessage);
        return;
      }

      window.snap.pay(data.snap_token, {
        onSuccess: () =>
          router.push(`/cart/payment-success?order_id=${orderId}`),
        onPending: () =>
          router.push(`/cart/payment-pending?order_id=${orderId}`),
        onError: () => router.push(`/cart/payment-failed?order_id=${orderId}`),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal melanjutkan pembayaran";
      alert(message);
    } finally {
      setIsResuming(false);
    }
  }

  async function handleCancelOrder() {
    if (!orderId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order?",
    );
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      await actionCancelOrder(orderId);
      router.push(`/cart/payment-failed?order_id=${orderId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel order";
      alert(message);
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Pending Card */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-8 md:p-12 text-center mb-8">
            {/* Pending Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse"></div>
                <div className="relative bg-amber-500 rounded-full p-4 shadow-lg">
                  <Clock className="w-12 h-12 text-white animate-spin" />
                </div>
              </div>
            </div>

            {/* Status Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Payment Pending
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Your payment is being processed. Please don't close this page.
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

            {/* Info Box */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-left mb-8">
              <p className="text-sm text-slate-700">
                <strong>What's next?</strong> Your payment status will be
                updated automatically. If the status doesn't change within 24
                hours, you can resume your payment below.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleResumePayment}
                disabled={!canResume || isResuming}
                className="flex items-center justify-center px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg gap-2"
              >
                {isResuming ? "Processing..." : "Resume Payment"}
                <ArrowRight className="w-5 h-5" />
              </button>
              <Link
                href="/products"
                className="flex items-center justify-center px-8 py-3 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition-all duration-300 gap-2"
              >
                Continue Shopping
              </Link>
              <button
                onClick={handleCancelOrder}
                disabled={!orderId || isCancelling}
                className="flex items-center justify-center px-8 py-3 border-2 border-red-500 text-red-500 font-bold rounded-lg hover:bg-red-500 hover:text-white disabled:border-slate-300 disabled:text-slate-300 disabled:cursor-not-allowed transition-all duration-300 gap-2"
              >
                <XCircle className="w-5 h-5" />
                {isCancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
            <h3 className="text-xl font-bold mb-3">Need Help?</h3>
            <p className="text-slate-300 mb-6">
              If your payment doesn't update or you need assistance, please
              contact our support team.
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
