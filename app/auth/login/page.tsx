"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { actionLoginUser, actionSignInWithGoogle } from "@/actions/authAction";
import { ILoginForm } from "@/types/definitions";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfile } from "@/lib/store/hookZustand";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  CheckCircle,
} from "lucide-react";

export function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ILoginForm>();

  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submitForm(data: ILoginForm) {
    try {
      setIsLoading(true);
      await actionLoginUser(data);
      router.push("/");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Background Gradient */}
      <div className="min-h-screen bg-linear-to-br from-black via-slate-900 to-black flex items-center justify-center px-4">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-bl from-slate-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-slate-500/20 to-transparent rounded-full blur-3xl"></div>

        {/* Error Message */}
        {message && (
          <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto flex items-center gap-3 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 z-50 animate-shake">
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Login Card */}
        <div className="relative w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 md:p-12 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-lg mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                Welcome Back
              </h1>
              <p className="text-slate-600">
                Sign in to your account to continue shopping
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-12 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                    {...register("email", { required: "Email is required" })}
                  />
                </div>
                {errors?.email && (
                  <span className="text-sm text-red-600 font-medium">
                    {errors.email.message || "Email is required"}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-12 pr-12 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                    {...register("password", {
                      required: "Password is required",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-black transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors?.password && (
                  <span className="text-sm text-red-600 font-medium">
                    {errors.password.message || "Password is required"}
                  </span>
                )}
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-black text-white font-bold text-lg rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-600">or</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={async () => {
                setIsGoogleLoading(true);
                try {
                  const url = await actionSignInWithGoogle();
                  if (url) {
                    // Redirect to Google OAuth page
                    window.location.href = url;
                  }
                } catch (error) {
                  console.error("Google sign-in failed:", error);
                  setIsGoogleLoading(false);
                }
              }}
              disabled={isGoogleLoading}
              className="w-full py-3 px-6 bg-white border-2 border-slate-300 text-slate-700 font-bold text-lg rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-slate-600">
              Don't have an account?{" "}
              <Link
                href="/auth/register"
                className="text-black font-bold hover:underline transition"
              >
                Sign up now
              </Link>
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-slate-300">
            <div>
              <Lock className="w-6 h-6 mx-auto text-white mb-2" />
              <p>Secure Login</p>
            </div>
            <div>
              <Zap className="w-6 h-6 mx-auto text-white mb-2" />
              <p>Fast Access</p>
            </div>
            <div>
              <CheckCircle className="w-6 h-6 mx-auto text-white mb-2" />
              <p>Verified</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 bg-linear-to-br from-slate-300 to-slate-500 rounded-full mx-auto mb-4 animate-spin"></div>
            <p className="text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <Login />
    </Suspense>
  );
}
