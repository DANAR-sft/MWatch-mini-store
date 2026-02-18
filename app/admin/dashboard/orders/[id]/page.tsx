"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/store/hookZustand";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { formatIDR } from "@/lib/utils";
import {
  actionGetOrderByIdForAdmin,
  actionMarkOrderShipped,
} from "@/actions/orderAction";
import { OrderDetailRecord } from "@/services/order";
import {
  Truck,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  CreditCard,
  ArrowLeft,
  MapPin,
  User,
  Mail,
  Calendar,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";

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

export default function OrderDetailPage() {
  const { profile } = useProfile();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await actionGetOrderByIdForAdmin(orderId);
      setOrder(data);
    } catch (error) {
      console.error("Failed to load order", error);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      router.push("/");
      return;
    }
    loadOrder();
  }, [orderId]);

  async function sendEmail(name: string) {
    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name || "Customer" }),
      });

      if (response.ok) {
        toast.success("Email sent successfully!");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  }

  async function handleShipOrder() {
    if (!order) return;
    setIsProcessing(true);
    try {
      await actionMarkOrderShipped(order.id);
      setOrder((prev) => (prev ? { ...prev, status: "shipped" } : prev));
      toast.success("Order marked as shipped");

      broadcast(CHANNELS.ORDERS, EVENTS.ORDER_SHIPPED, {
        orderId: order.id,
        userId: order.user_id,
        status: "shipped",
      }).catch((err) => {
        console.warn("[Realtime] broadcast failed:", err);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal update status order";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleShipAndNotify() {
    if (!order) return;
    setIsProcessing(true);
    try {
      await handleShipOrder();
      await sendEmail(order.shipping_address || "Customer");
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
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

  if (loading) {
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
          <div className="w-full min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4 animate-pulse" />
              <p className="text-slate-600">Loading order details...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!order) {
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
          <div className="w-full min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2">
                Order Not Found
              </h3>
              <p className="text-slate-600 mb-4">
                The order you&apos;re looking for doesn&apos;t exist.
              </p>
              <button
                onClick={() => router.push("/admin/dashboard/orders")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-900 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Orders
              </button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => router.push("/admin/dashboard/orders")}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-black mb-6 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Orders
            </button>

            {/* Order Header */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-3">
                    <Package className="w-8 h-8" />
                    Order Details
                  </h1>
                  <p className="text-slate-600 mt-1 font-mono text-sm">
                    ID: {order.id}
                  </p>
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Date
                    </p>
                    <p className="text-sm font-medium text-black">
                      {new Date(order.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Customer
                    </p>
                    <p className="text-sm font-medium text-black">
                      {order.profiles?.full_name || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Email
                    </p>
                    <p className="text-sm font-medium text-black truncate max-w-50">
                      {order.profiles?.email || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Shipping Address
                    </p>
                    <p className="text-sm font-medium text-black">
                      {order.shipping_address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {order.payment_id && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Payment Info
                      </p>
                      <p className="text-sm font-medium text-black">
                        {order.payment_type || "N/A"} - {order.payment_id}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-6 shadow-sm">
              <h2 className="text-lg font-bold text-black mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-black truncate">
                        {item.products?.name || "Unknown Product"}
                      </p>
                      <p className="text-sm text-slate-500">
                        Qty: {item.quantity} × Rp
                        {formatIDR(item.price_at_purchase)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">
                        Rp{formatIDR(item.quantity * item.price_at_purchase)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 uppercase font-semibold">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-black">
                    Rp{formatIDR(order.total_amount)}
                  </p>
                </div>

                {order.status === "paid" && (
                  <button
                    onClick={() => handleShipAndNotify()}
                    disabled={isProcessing}
                    className={`w-full md:w-auto px-6 py-3 bg-black text-white font-bold rounded-lg transition hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2 ${isProcessing ? "opacity-70 cursor-wait" : "hover:bg-slate-900"}`}
                  >
                    {isProcessing ? (
                      "Processing..."
                    ) : (
                      <>
                        <Truck className="w-5 h-5" />
                        Mark as Shipped
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
