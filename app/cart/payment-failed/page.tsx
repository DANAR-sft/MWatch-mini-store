"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

function PaymentFailed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-linear-to-b from-red-50 to-white py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Failed Card */}
          <div className="bg-white rounded-2xl border-2 border-red-200 p-8 md:p-12 text-center mb-8">
            {/* Failed Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse"></div>
                <div className="relative bg-red-500 rounded-full p-4 shadow-lg">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Status Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Payment Failed
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Unfortunately, your payment could not be processed. Please check
              your payment details and try again.
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

            {/* Possible Reasons */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-left mb-8">
              <p className="text-sm text-slate-700 font-bold mb-3">
                Why did my payment fail?
              </p>
              <ul className="text-sm text-slate-700 space-y-2 list-disc list-inside">
                <li>Insufficient funds in your account</li>
                <li>Incorrect card or payment details</li>
                <li>Payment gateway temporary issues</li>
                <li>Your bank declined the transaction</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center px-8 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 transition-all duration-300 hover:shadow-lg gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
              <Link
                href="/products"
                className="flex items-center justify-center px-8 py-3 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition-all duration-300 gap-2"
              >
                Continue Shopping
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="bg-slate-900 rounded-2xl p-8 text-center text-white">
            <h3 className="text-xl font-bold mb-3">Still Having Issues?</h3>
            <p className="text-slate-300 mb-6">
              Our support team is here to help. We'll investigate your payment
              issue and get you back on track.
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

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFailed />
    </Suspense>
  );
}
