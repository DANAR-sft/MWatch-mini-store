"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile, useProducts } from "@/lib/store/hookZustand";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { DialogDeleteProduct } from "@/components/dialogDeleteProduct";
import { DialogUpdateProduct } from "@/components/dialogUpdateProduct";
import {
  Edit2,
  Trash2,
  Package,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import {
  subscribeToChannel,
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS,
} from "@/lib/supabase/realtime";

export default function Page() {
  const { profile } = useProfile();
  const router = useRouter();
  const { products, fetchProducts } = useProducts();

  useEffect(() => {
    fetchProducts();

    const channel = subscribeToChannel(
      CHANNELS.PRODUCTS,
      [EVENTS.STOCK_UPDATED, EVENTS.PRODUCT_CREATED, EVENTS.PRODUCT_DELETED],
      (event, payload) => {
        console.log("Admin dashboard received product update:", event, payload);
        fetchProducts();
      },
    );

    return () => {
      unsubscribeFromChannel(channel);
    };
  }, [fetchProducts]);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      router.push("/");
    }
  }, []);

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
          <div className="max-w-7xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-black flex items-center gap-3">
                  <ShoppingCart className="w-8 h-8" />
                  Product Inventory
                </h1>
                <p className="text-slate-600 mt-2">
                  Manage and monitor all your product listings
                </p>
              </div>
              <div className="bg-white rounded-lg border-2 border-slate-200 p-4 shadow-sm">
                <p className="text-sm text-slate-600 font-medium">
                  Total Products
                </p>
                <p className="text-3xl font-bold text-black">
                  {products.length}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Total Stock
                </p>
                <p className="text-2xl font-bold text-black">
                  {products.reduce((sum, p) => sum + (p.stock || 0), 0)}
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Low Stock Items
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {products.filter((p) => p.stock < 5).length}
                </p>
              </div>
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
                <p className="text-sm text-slate-600 font-medium mb-2">
                  Out of Stock
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter((p) => p.stock === 0).length}
                </p>
              </div>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center shadow-sm">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-black mb-2">
                  No Products
                </h3>
                <p className="text-slate-600">
                  Start by adding your first product to the inventory
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Image Container */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden group">
                      <img
                        src={
                          Array.isArray(product.image_url)
                            ? product.image_url[0]
                            : product.image_url
                        }
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {/* Stock Badge */}
                      <div
                        className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-white ${
                          product.stock > 10
                            ? "bg-green-500"
                            : product.stock > 0
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                      >
                        {product.stock} in stock
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">
                        {product.category}
                      </p>
                      <h3 className="font-bold text-black line-clamp-2 mb-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                        {product.description}
                      </p>

                      {/* Price */}
                      <p className="text-lg font-bold text-black mb-4">
                        Rp{formatIDR(product.price)}
                      </p>

                      {/* Stock Indicator */}
                      {product.stock === 0 && (
                        <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-4 bg-red-50 p-2 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          Out of Stock
                        </div>
                      )}
                      {product.stock < 5 && product.stock > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-4 bg-amber-50 p-2 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          Low Stock
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <DialogUpdateProduct id={product.id} />
                        <DialogDeleteProduct id={product.id} />
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
