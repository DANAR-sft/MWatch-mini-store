import Link from "next/link";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Search,
  Store,
  ShoppingCart,
  Menu,
  X,
  Package,
  LayoutDashboard,
} from "lucide-react";
import { Label } from "./ui/label";
import { useAuth } from "../lib/store/hookZustand";
import { useProfile } from "../lib/store/hookZustand";
import { useEffect, useState, Suspense } from "react";
import { HoverProfile } from "./hoverProfile";
import { useSearch } from "../lib/store/hookZustand";
import { useRouter, usePathname } from "next/navigation";
import { IconInnerShadowTop } from "@tabler/icons-react";

function NavbarComponent() {
  const { fetchUser, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, fetchProfileById } = useProfile();
  const {
    isFound,
    setIsFound,
    setTemporaryQuery,
    setItems,
    allItems,
    setAllItems,
    fetchItems,
    setIsLoading,
    setIsSearching,
    setIsNotFound,
  } = useSearch();

  async function filterBySearch(query: string) {
    if (pathname !== "/products") {
      // only set the search query and navigate — let /products handle filtering
      setTemporaryQuery(query);
      router.push("/products");
      return;
    }
    const term = query.trim().toLowerCase();
    if (term === "") {
      setItems(allItems);
      setIsSearching(false);
      setIsNotFound(false);

      return;
    }

    setIsSearching(true);

    setTimeout(() => {
      const filtered = allItems.filter((product) =>
        product.name.toLowerCase().includes(term),
      );

      setItems(filtered);
      setIsSearching(false);

      if (filtered.length === 0) {
        setIsNotFound(true);
      } else {
        setIsNotFound(false);
      }
    }, 300);
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const items = await fetchItems();
      setAllItems(items);
      setItems(items);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pathname === "/products") {
        filterBySearch(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    fetchUser().then((data) => {
      if (data && data.id) {
        fetchProfileById(data.id);
      }
    });
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <IconInnerShadowTop className="w-6 h-6" />
            <h1 className="text-black text-lg sm:text-xl font-bold sm:inline">
              MWatch
            </h1>
          </Link>

          {/* Desktop Search Bar - Hidden on Mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <Input
              id="search"
              placeholder="Search product . . . . "
              className="rounded-full pr-10"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  filterBySearch(searchQuery);
                  if (pathname !== "/products") {
                    setTemporaryQuery(searchQuery);
                    setSearchQuery("");
                    router.push("/products");
                  }
                }
              }}
            />
            <Label
              htmlFor="search"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <Search
                className="w-5 h-5"
                onClick={() => {
                  filterBySearch(searchQuery);
                  if (pathname !== "/products") {
                    setTemporaryQuery(searchQuery);
                    setSearchQuery("");
                    router.push("/products");
                  }
                }}
              />
            </Label>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <Link href="/products">
              <Button variant="outline" size="sm" className="gap-2">
                <Store className="w-4 h-4" />
                Product
              </Button>
            </Link>

            {profile?.role === "admin" ? (
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href={`/cart/${profile?.id}`}>
                <ShoppingCart className="w-5 h-5 hover:scale-110 transition-transform" />
              </Link>
            )}

            <div className="border-l border-gray-300 h-6 mx-1"></div>

            {profile ? (
              <HoverProfile
                id={profile.id}
                full_name={profile.full_name || ""}
                email={profile.email || ""}
                role={profile.role || "customer"}
              />
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3 mb-3">
          <div className="relative">
            <Input
              id="search-mobile"
              placeholder="Search . . . "
              className="rounded-full pr-10 text-sm"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  filterBySearch(searchQuery);
                  if (pathname !== "/products") {
                    setTemporaryQuery(searchQuery);
                    setSearchQuery("");
                    router.push("/products");
                  }
                }
              }}
            />
            <Label
              htmlFor="search-mobile"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <Search
                className="w-4 h-4"
                onClick={() => {
                  filterBySearch(searchQuery);
                  if (pathname !== "/products") {
                    setTemporaryQuery(searchQuery);
                    setSearchQuery("");
                    router.push("/products");
                  }
                }}
              />
            </Label>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 pt-3 pb-3 space-y-2">
            <Link href="/products" className="block">
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Store className="w-4 h-4" />
                Products
              </Button>
            </Link>

            {profile?.role === "admin" ? (
              <Link href="/admin/dashboard" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href={`/cart/${profile?.id}`} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Cart
                  </Button>
                </Link>
                <Link href={`/orders`} className="block">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Orders
                  </Button>
                </Link>
              </>
            )}

            <div className="border-t border-gray-200 my-2"></div>

            {profile ? (
              <div className="px-2 py-2 text-sm">
                <p className="font-semibold text-gray-800">
                  {profile.full_name}
                </p>
                <p className="text-gray-500 text-xs">{profile.email}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link href="/auth/login" className="block">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register" className="block">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavbarComponent />
    </Suspense>
  );
}
