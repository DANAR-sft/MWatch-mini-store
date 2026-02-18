"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/store/hookZustand";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { formatIDR } from "@/lib/utils";
import {
  actionGetAllOrdersForAdmin,
  actionMarkOrderShipped,
} from "@/actions/orderAction";
import { IOrder } from "@/types/definitions";
import {
  Truck,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard,
  List,
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

type StatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "failed";

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; bgColor: string; textColor: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
  },
  paid: {
    label: "Paid",
    icon: <CreditCard className="w-4 h-4" />,
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  shipped: {
    label: "Shipped",
    icon: <Truck className="w-4 h-4" />,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="w-4 h-4" />,
    bgColor: "bg-red-100",
    textColor: "text-red-700",
  },
};

export default function Page() {
  const { profile } = useProfile();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<IOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Function to load orders
  async function loadOrders() {
    try {
      const orders = await actionGetAllOrdersForAdmin();
      setAllOrders(orders);
    } catch (error) {
      console.error("Failed to load orders", error);
    }
  }

  // Filter orders based on selected status
  const filteredOrders =
    statusFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === statusFilter);

  // Count orders by status
  const orderCounts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === "pending").length,
    paid: allOrders.filter((o) => o.status === "paid").length,
    shipped: allOrders.filter((o) => o.status === "shipped").length,
    completed: allOrders.filter((o) => o.status === "completed").length,
    failed: allOrders.filter((o) => o.status === "failed").length,
  };

  // Calculate total revenue (from paid, shipped, completed orders)
  const totalRevenue = allOrders
    .filter((o) => ["paid", "shipped", "completed"].includes(o.status || ""))
    .reduce((sum, o) => sum + o.total_amount, 0);

  useEffect(() => {
    loadOrders();

    // Subscribe to orders broadcast channel
    const channel = subscribeToChannel(
      CHANNELS.ORDERS,
      [
        EVENTS.ORDER_CREATED,
        EVENTS.ORDER_PENDING,
        EVENTS.ORDER_PAID,
        EVENTS.ORDER_SHIPPED,
        EVENTS.ORDER_COMPLETED,
        EVENTS.ORDER_UPDATED,
      ],
      (event, payload) => {
        console.log("Admin received broadcast:", event, payload);

        if (event === EVENTS.ORDER_CREATED) {
          toast.info(`New order created!`);
        } else if (event === EVENTS.ORDER_PENDING) {
          toast.info(`Order payment pending`);
        } else if (event === EVENTS.ORDER_PAID) {
          toast.success(`New paid order received!`);
        } else if (event === EVENTS.ORDER_SHIPPED) {
          toast.info(`Order marked as shipped`);
        } else if (event === EVENTS.ORDER_COMPLETED) {
          toast.success(`Order completed!`);
        }
        loadOrders();
      },
    );

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, []);

  // Polling fallback when realtime fails (keeps UI responsive when TIMED_OUT persists)
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;

    try {
      if (isChannelFailed(CHANNELS.ORDERS)) {
        console.warn(
          "[AdminOrders] realtime failed — starting polling fallback",
        );
        poll = setInterval(() => loadOrders(), 15000);
      } else {
        const checker = setInterval(() => {
          if (isChannelFailed(CHANNELS.ORDERS) && !poll) {
            console.warn(
              "[AdminOrders] realtime detected failure — enabling polling fallback",
            );
            poll = setInterval(() => loadOrders(), 15000);
          }
        }, 5000);

        return () => clearInterval(checker);
      }
    } catch (err) {
      console.error("[AdminOrders] polling fallback error", err);
    }

    return () => {
      if (poll) clearInterval(poll);
    };
  }, [loadOrders]);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      router.push("/");
    }
  }, []);

  async function sendEmail(name: string) {
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name || "Customer" }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Email sent successfully!");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email");
    }
  }

  async function handleShipOrder(orderId: string) {
    try {
      // Find the order to get user_id for broadcasting
      const order = allOrders.find((o) => o.id === orderId);

      await actionMarkOrderShipped(orderId);
      // Update local state
      setAllOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "shipped" } : o)),
      );
      toast.success("Order marked as shipped");

      // Broadcast the event so user's page gets updated (non-blocking)
      broadcast(CHANNELS.ORDERS, EVENTS.ORDER_SHIPPED, {
        orderId,
        userId: order?.user_id,
        status: "shipped",
      }).catch((err) => {
        console.warn("[Realtime] broadcast failed:", err);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal update status order";
      toast.error(message);
    }
  }

  function getStatusBadge(status: string | null) {
    const config = STATUS_CONFIG[status || "pending"] || STATUS_CONFIG.pending;
    return (
      <span
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${config.bgColor} ${config.textColor}`}
      >
        {config.icon}
        {config.label}
      </span>
    );
  }

  const filterTabs: {
    key: StatusFilter;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: "all", label: "All", icon: <List className="w-4 h-4" /> },
    { key: "pending", label: "Pending", icon: <Clock className="w-4 h-4" /> },
    { key: "paid", label: "Paid", icon: <CreditCard className="w-4 h-4" /> },
    { key: "shipped", label: "Shipped", icon: <Truck className="w-4 h-4" /> },
    {
      key: "completed",
      label: "Completed",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    { key: "failed", label: "Failed", icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="w-full min-h-screen bg-slate-50 py-8 px-4 md:px-8">
          {/* Header Section */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-black flex items-center gap-3">
                  <Package className="w-8 h-8" />
                  All Orders
                </h1>
                <p className="text-slate-600 mt-2">
                  Manage and track all orders on the platform
                </p>
              </div>
              <div className="bg-white rounded-lg border-2 border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600 font-medium">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-black">
                  {allOrders.length}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Total Revenue
                </p>
                <p className="text-xl font-bold text-green-600">
                  Rp{formatIDR(totalRevenue)}
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Pending Shipment
                </p>
                <p className="text-xl font-bold text-amber-600">
                  {orderCounts.paid}
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  In Transit
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {orderCounts.shipped}
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Completed
                </p>
                <p className="text-xl font-bold text-green-600">
                  {orderCounts.completed}
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    statusFilter === tab.key
                      ? "bg-black text-white"
                      : "bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      statusFilter === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {orderCounts[tab.key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center shadow-sm">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-black mb-2">
                  No Orders Found
                </h3>
                <p className="text-slate-600">
                  {statusFilter === "all"
                    ? "No orders have been placed yet."
                    : `No ${statusFilter} orders found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, index) => (
                  <div
                    key={order.id}
                    onClick={() =>
                      router.push(`/admin/dashboard/orders/${order.id}`)
                    }
                    className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Order Header */}
                    <div className="bg-linear-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-600 font-semibold uppercase">
                          Order ID
                        </p>
                        <p className="font-mono text-sm font-bold text-black mt-1">
                          {order.id.substring(0, 12)}...
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold uppercase">
                            Customer ID
                          </p>
                          <p className="text-sm font-medium text-black mt-1">
                            {order.user_id
                              ? order.user_id.substring(0, 8) + "..."
                              : "N/A"}
                          </p>
                        </div>
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
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>

                    {/* Order Content */}
                    <div className="px-6 py-6">
                      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-600 font-semibold uppercase mb-1">
                            Total Amount
                          </p>
                          <p className="text-3xl font-bold text-black">
                            Rp{formatIDR(order.total_amount)}
                          </p>
                          {order.shipping_address && (
                            <p className="text-sm text-slate-500 mt-2">
                              <span className="font-medium">Ship to:</span>{" "}
                              {order.shipping_address}
                            </p>
                          )}
                        </div>
                        {/* Action Buttons based on status */}
                        {order.status === "paid" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShipOrder(order.id);
                              sendEmail(order.shipping_address || "Customer");
                            }}
                            className="w-full md:w-auto px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 transition hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <Truck className="w-5 h-5" />
                            Mark as Shipped
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
