"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { useAuth, useProfile } from "@/lib/store/hookZustand";
import {
  actionGetCurrentUserOrders,
  actionMarkOrderCompleted,
} from "@/actions/orderAction";
import { IOrder } from "@/types/definitions";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import {
  subscribeToChannel,
  unsubscribeFromChannel,
  broadcast,
  CHANNELS,
  EVENTS,
  isChannelFailed,
} from "@/lib/supabase/realtime";

export default function Page() {
  const router = useRouter();
  const { fetchUser } = useAuth();
  const { profile, fetchProfileById } = useProfile();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Move loadOrders outside useEffect to avoid stale closure
  const loadOrders = async () => {
    try {
      const data = await actionGetCurrentUserOrders();
      setOrders(data);
      console.log("[Orders] Loaded orders:", data.length);
    } catch (error) {
      console.error("Failed to load orders", error);
    }
  };

  useEffect(() => {
    fetchUser().then((data) => {
      if (!data || !data.id) {
        router.push("/auth/login");
        return;
      }

      fetchProfileById(data.id);
    });
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    if (profile.role !== "customer") {
      router.push("/");
      return;
    }

    loadOrders();

    // Subscribe to orders broadcast channel
    const channel = subscribeToChannel(
      CHANNELS.ORDERS,
      [
        EVENTS.ORDER_PAID,
        EVENTS.ORDER_SHIPPED,
        EVENTS.ORDER_COMPLETED,
        EVENTS.ORDER_UPDATED,
      ],
      (event, payload) => {
        console.log("User received broadcast:", event, payload);
        const eventUserId = payload.userId as string | undefined;

        // Only process events for this user
        if (eventUserId && eventUserId !== profile.id) {
          return;
        }

        if (event === EVENTS.ORDER_SHIPPED) {
          toast.success("Your order has been shipped!");
          loadOrders();
        } else if (event === EVENTS.ORDER_COMPLETED) {
          toast.success("Order completed!");
          loadOrders();
        } else if (event === EVENTS.ORDER_PAID) {
          toast.success("Payment confirmed!");
          loadOrders();
        } else {
          loadOrders();
        }
      },
    );

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [profile]);

  // Polling fallback when realtime fails (keeps UI responsive when TIMED_OUT persists)
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;

    try {
      if (isChannelFailed(CHANNELS.ORDERS)) {
        console.warn("[Orders] realtime failed — starting polling fallback");
        poll = setInterval(() => loadOrders(), 15000);
      } else {
        // watch for a future failure and start polling if needed
        const checker = setInterval(() => {
          if (isChannelFailed(CHANNELS.ORDERS) && !poll) {
            console.warn(
              "[Orders] realtime detected failure — enabling polling fallback",
            );
            poll = setInterval(() => loadOrders(), 15000);
          }
        }, 5000);

        return () => clearInterval(checker);
      }
    } catch (err) {
      console.error("[Orders] polling fallback error", err);
    }

    return () => {
      if (poll) clearInterval(poll);
    };
  }, [loadOrders]);

  async function handleReceive(orderId: string) {
    try {
      await actionMarkOrderCompleted(orderId);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "completed" } : order,
        ),
      );
      toast.success("Order received successfully");

      // Broadcast the completion event (non-blocking)
      broadcast(CHANNELS.ORDERS, EVENTS.ORDER_COMPLETED, {
        orderId,
        userId: profile?.id,
        status: "completed",
      }).catch((err) => {
        console.warn("[Realtime] broadcast failed:", err);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menerima barang";
      toast.error(message);
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Section */}
      <div className="bg-linear-to-r from-black via-slate-900 to-black py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8 text-white" />
            <h1 className="text-4xl font-bold text-white">My Orders</h1>
          </div>
          <p className="text-slate-300">
            Track and manage all your purchases in one place
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center w-full py-12 px-4">
        <div className="w-full max-w-4xl">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">
                    Total Orders
                  </p>
                  <p className="text-3xl font-bold text-black mt-1">
                    {orders.length}
                  </p>
                </div>
                <ShoppingBag className="w-10 h-10 text-slate-300" />
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {orders.filter((o) => o.status === "pending").length}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-amber-300" />
              </div>
            </div>
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {orders.filter((o) => o.status === "completed").length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-300" />
              </div>
            </div>
          </div>

          {/* Orders List or Empty State */}
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center shadow-sm">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2">
                No Orders Yet
              </h3>
              <p className="text-slate-600 mb-6">
                You haven't made any purchases yet. Start shopping to see your
                orders here.
              </p>
              <Button
                onClick={() => router.push("/products")}
                className="bg-black text-white hover:bg-slate-900 px-8 py-2 rounded-lg font-bold transition hover:scale-105"
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((order, index) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Order Header */}
                    <div className="bg-linear-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">
                          Order ID
                        </p>
                        <p className="font-mono text-sm font-bold text-black mt-1">
                          {order.id.substring(0, 8)}...
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold uppercase">
                            Date
                          </p>
                          <p className="text-sm font-medium text-black mt-1">
                            {new Date(order.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        {/* Status Badge */}
                        <div className="flex items-end">
                          <span
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : order.status === "shipped"
                                  ? "bg-blue-100 text-blue-700"
                                  : order.status === "pending"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                          >
                            {order.status && (
                              <>
                                {order.status === "completed" ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : order.status === "shipped" ? (
                                  <Truck className="w-4 h-4" />
                                ) : order.status === "pending" ? (
                                  <Clock className="w-4 h-4" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                                {order.status.charAt(0).toUpperCase() +
                                  order.status.slice(1)}
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Content */}
                    <div className="px-6 py-6">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold uppercase mb-1">
                            Total Amount
                          </p>
                          <p className="text-3xl font-bold text-black">
                            Rp{formatIDR(order.total_amount)}
                          </p>
                        </div>
                        <button
                          disabled={order.status !== "shipped"}
                          onClick={() => handleReceive(order.id)}
                          className="w-full sm:w-auto px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          {order.status === "shipped" ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Mark as Received
                            </>
                          ) : order.status === "completed" ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              Received
                            </>
                          ) : (
                            <>
                              <Clock className="w-5 h-5" />
                              In Process
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Pagination */}
          {orders.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-8 p-4 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  Halaman {currentPage} dari{" "}
                  {Math.ceil(orders.length / itemsPerPage)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(orders.length / itemsPerPage), p + 1),
                    )
                  }
                  disabled={
                    currentPage === Math.ceil(orders.length / itemsPerPage)
                  }
                  className="p-2 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-sm font-medium text-slate-600">
                {orders.length} total
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
