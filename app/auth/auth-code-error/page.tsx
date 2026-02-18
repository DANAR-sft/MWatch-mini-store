"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-black via-slate-900 to-black flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 md:p-12 shadow-2xl max-w-md w-full text-center">
        <div className="flex items-center justify-center w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-black mb-2">
          Authentication Error
        </h1>
        <p className="text-slate-600 mb-6">
          Something went wrong during the authentication process. Please try
          again.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
