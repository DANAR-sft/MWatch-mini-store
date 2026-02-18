import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-100">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-bold mb-3">MWatch</h3>
            <p className="text-sm text-gray-400">
              Discover timeless design and smart features. Premium watches for
              every moment.
            </p>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/products" className="hover:text-white transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition">
                  Best Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/dashboard"
                  className="hover:text-white transition"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Newsletter</h4>
            <p className="text-sm text-gray-400 mb-3">
              Get exclusive offers and updates delivered to your inbox.
            </p>
            <form className="flex flex-col gap-2">
              <input
                aria-label="email"
                placeholder="your@email.com"
                type="email"
                className="px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500 transition"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom divider and links */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div>© {new Date().getFullYear()} MWatch. All rights reserved.</div>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
