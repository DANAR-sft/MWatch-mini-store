"use client";

import { Navbar } from "@/components/navbar";
import { CardProduct } from "@/components/cardProduct";
import { useCallback, useEffect, useRef, useState } from "react";
import { IProduct } from "@/types/definitions";
import { useSearch } from "@/lib/store/hookZustand";
import { Input } from "@/components/ui/input";
import Footer from "@/components/footer";
import { Search } from "lucide-react";
import {
  subscribeToChannel,
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS,
} from "@/lib/supabase/realtime";

type ProductWithCreatedAt = IProduct & { created_at?: string | null };

export default function Page() {
  const {
    items,
    setItems,
    fetchItems,
    isLoading,
    isSearching,
    isNotFound,
    allItems,
    setAllItems,
    setIsSearching,
    setIsLoading,
    setIsNotFound,
    temporaryQuery,
    setTemporaryQuery,
  } = useSearch();
  const [category, setCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("all");

  const filterStateRef = useRef({
    temporaryQuery: "",
    category: "All",
    sortBy: "all",
  });
  const allItemsRef = useRef<ProductWithCreatedAt[]>([]);

  useEffect(() => {
    filterStateRef.current = { temporaryQuery, category, sortBy };
  }, [temporaryQuery, category, sortBy]);

  useEffect(() => {
    allItemsRef.current = (allItems as ProductWithCreatedAt[]) ?? [];
  }, [allItems]);

  const computeAndSetItems = useCallback(
    (baseItems: ProductWithCreatedAt[]) => {
      const {
        temporaryQuery: query,
        category: selectedCategory,
        sortBy: selectedSort,
      } = filterStateRef.current;

      const term = (query ?? "").trim().toLowerCase();
      const hasBaseItems = baseItems.length > 0;

      let next = [...baseItems];

      if (selectedCategory !== "All") {
        const normalizedCategory = selectedCategory.trim().toLowerCase();
        next = next.filter(
          (product) =>
            (product.category ?? "").trim().toLowerCase() ===
            normalizedCategory,
        );
      }

      if (term !== "") {
        next = next.filter((product) =>
          (product.name ?? "").toLowerCase().includes(term),
        );
      }

      if (selectedSort === "asc") {
        next.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      } else if (selectedSort === "desc") {
        next.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      } else if (selectedSort === "newest") {
        next.sort((a, b) => {
          const aTime = a.created_at ? Date.parse(a.created_at) : 0;
          const bTime = b.created_at ? Date.parse(b.created_at) : 0;
          return bTime - aTime;
        });
      } else if (selectedSort === "oldest") {
        next.sort((a, b) => {
          const aTime = a.created_at ? Date.parse(a.created_at) : 0;
          const bTime = b.created_at ? Date.parse(b.created_at) : 0;
          return aTime - bTime;
        });
      }

      setItems(next as IProduct[]);

      const hasActiveFilters =
        term !== "" || selectedCategory !== "All" || selectedSort !== "all";
      setIsNotFound(hasBaseItems && hasActiveFilters && next.length === 0);
    },
    [setItems, setIsNotFound],
  );

  useEffect(() => {
    if (allItemsRef.current.length > 0) return;

    let isCancelled = false;
    const fetchAll = async () => {
      setIsLoading(true);
      const all = await fetchItems();
      if (isCancelled) return;
      setAllItems(all);
      allItemsRef.current = all as ProductWithCreatedAt[];
      computeAndSetItems(allItemsRef.current);
      setIsLoading(false);
    };

    fetchAll();
    return () => {
      isCancelled = true;
    };
  }, [fetchItems, setAllItems, setIsLoading, computeAndSetItems]);

  useEffect(() => {
    if (!allItems || allItems.length === 0) return;
    computeAndSetItems(allItems as ProductWithCreatedAt[]);
  }, [allItems, category, sortBy, computeAndSetItems]);

  useEffect(() => {
    if (!allItemsRef.current || allItemsRef.current.length === 0) return;
    const term = (temporaryQuery ?? "").trim();
    if (term === "") {
      setIsSearching(false);
      computeAndSetItems(allItemsRef.current);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      computeAndSetItems(allItemsRef.current);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [temporaryQuery, setIsSearching, computeAndSetItems]);

  // Subscribe to product/stock updates
  useEffect(() => {
    console.log(
      "[Products] subscription effect running — attempting to subscribe to products channel",
    );
    let channel: ReturnType<typeof subscribeToChannel> | undefined;

    try {
      channel = subscribeToChannel(
        CHANNELS.PRODUCTS,
        [EVENTS.STOCK_UPDATED, EVENTS.PRODUCT_CREATED, EVENTS.PRODUCT_DELETED],
        async (event, payload) => {
          console.log("Products received broadcast:", event, payload);

          // Refetch products when stock is updated or product changes
          const all = await fetchItems();
          setAllItems(all);
          setItems(all);
        },
      );
    } catch (err) {
      console.error("[Products] subscribeToChannel threw error:", err);
    }

    return () => {
      console.log(
        "[Products] cleanup — unsubscribing from products channel",
        channel,
      );
      try {
        if (channel) unsubscribeFromChannel(channel);
      } catch (err) {
        console.error("[Products] unsubscribe error:", err);
      }
    };
  }, [fetchItems, setAllItems, setItems]);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full bg-linear-to-br from-black via-slate-900 to-black overflow-hidden py-16 md:py-20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-linear-to-bl from-slate-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-linear-to-tr from-slate-500/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Our Collection
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto">
              Explore our curated selection of premium watches and accessories
              designed for those who appreciate quality and style
            </p>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <div className="sticky top-30 md:top-15 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
              <Input
                id="search"
                placeholder="Search products..."
                className="pl-12 pr-4 py-3 rounded-lg border-2 border-slate-300 focus:border-slate-600 focus:outline-none transition-all text-slate-900 placeholder:text-slate-500 font-medium"
                type="search"
                onChange={(e) => setTemporaryQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setIsSearching(false);
                    computeAndSetItems(allItemsRef.current);
                  }
                }}
              />
            </div>

            {/* Category and Sort - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 border-2 border-slate-300 rounded-lg text-sm md:text-base font-medium text-slate-900 bg-white hover:border-slate-500 focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Man">Man</option>
                <option value="Women">Women</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border-2 border-slate-300 rounded-lg text-sm md:text-base font-medium text-slate-900 bg-white hover:border-slate-500 focus:border-slate-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">Sort By</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>

              <div className="flex items-center justify-center text-sm md:text-base font-semibold text-slate-700 bg-slate-100 rounded-lg py-3">
                Found:{" "}
                <span className="text-slate-900 mx-2">{items.length}</span>
                results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <main className="w-full bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 min-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 bg-linear-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
                <p className="text-slate-600 font-medium">
                  Loading products...
                </p>
              </div>
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 bg-linear-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-pulse"></div>
                <p className="text-slate-600 font-medium">Searching...</p>
              </div>
            </div>
          ) : isNotFound ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                No products found
              </p>
              <p className="text-slate-600 text-center">
                Try adjusting your search terms or explore different categories
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-xl font-semibold text-slate-900">
                No products available
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {items.map((product, index) => (
                <div
                  key={product.id}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardProduct
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    price={product.price}
                    stock={product.stock}
                    image_url={product.image_url}
                    category={product.category}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

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
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
