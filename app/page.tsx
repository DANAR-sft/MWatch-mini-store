"use client";

import Image from "next/image";
import { Navbar } from "../components/navbar";
import { useProducts } from "@/lib/store/hookZustand";
import { useEffect } from "react";
import { CardProduct } from "@/components/cardProduct";
import Footer from "@/components/footer";
import { Zap, Shield, RotateCcw, ArrowRight } from "lucide-react";

export default function Home() {
  const { products, fetchProducts } = useProducts();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative w-full min-h-screen md:min-h-96 bg-linear-to-br from-black via-slate-900 to-black flex items-center overflow-hidden p-10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-slate-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-slate-500/20 to-transparent rounded-full blur-3xl"></div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                  Experience Time
                  <span className="block bg-linear-to-r from-slate-300 to-slate-500 bg-clip-text text-transparent">
                    Redefined
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">
                  Premium watches and accessories crafted with precision.
                  Explore our collection of timeless elegance blended with
                  modern technology.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/products"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-400 text-white font-semibold rounded-lg hover:bg-slate-800 transition-all duration-300"
                >
                  Explore Collection
                </a>
              </div>

              {/* Stats */}
              <div className="pt-8 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-white">500+</p>
                  <p className="text-slate-400 text-sm">Premium Products</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">10k+</p>
                  <p className="text-slate-400 text-sm">Happy Customers</p>
                </div>
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/watch4.jpg"
                  alt="Premium Watch Collection"
                  fill={true}
                  sizes={
                    "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  }
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="w-full py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Featured Products
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-slate-400 to-slate-600 mx-auto mb-6"></div>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Discover our handpicked selection of premium watches and
              accessories
            </p>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.slice(0, 6).map((product, index) => (
              <div
                key={product.id}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
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

          {/* View All Button */}
          <div className="text-center mt-16">
            <a
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-black text-white font-semibold rounded-lg hover:bg-slate-900 transition-all duration-300 hover:shadow-lg group"
            >
              View All Products
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="w-full bg-linear-to-b from-slate-50 to-white py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Why Choose Us
            </h2>
            <div className="w-20 h-1 bg-linear-to-r from-slate-400 to-slate-600 mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-500 rounded-lg mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">
                Fast & Free Shipping
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Get your order delivered quickly with free shipping on all
                orders above Rp500.000
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-500 rounded-lg mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">
                Secure Payments
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Multiple payment options with secure checkout powered by
                Midtrans
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white p-8 rounded-xl border-2 border-slate-200 hover:border-slate-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-slate-300 to-slate-500 rounded-lg mb-6 group-hover:scale-110 transition-transform">
                <RotateCcw className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">
                Easy Returns
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Hassle-free returns and exchanges within 30 days of purchase
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </>
  );
}
