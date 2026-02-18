"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IRegisterForm } from "@/types/definitions";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { actionRegisterUser } from "@/actions/authAction";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle,
  Gift,
  Zap,
} from "lucide-react";

export function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IRegisterForm>();

  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submitForm(data: IRegisterForm) {
    try {
      setIsLoading(true);
      await actionRegisterUser(data);

      router.push("/");
    } catch (error) {
      console.error("Registration failed:", error);
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

        {/* Register Card */}
        <div className="relative w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 md:p-12 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-lg mx-auto mb-4">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">
                Create Account
              </h1>
              <p className="text-slate-600">Join us and start shopping today</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(submitForm)} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-black">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-12 py-3 border-2 border-slate-300 rounded-lg focus:border-black focus:outline-none transition-all font-medium"
                    {...register("name", { required: "Name is required" })}
                  />
                </div>
                {errors?.name && (
                  <span className="text-sm text-red-600 font-medium">
                    {errors.name.message || "Name is required"}
                  </span>
                )}
              </div>

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
                    placeholder="........"
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

              {/* Terms & Conditions */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-black rounded mt-1"
                />
                <span className="text-xs text-slate-600">
                  I agree to the{" "}
                  <span className="text-black font-bold cursor-pointer hover:underline">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-black font-bold cursor-pointer hover:underline">
                    Privacy Policy
                  </span>
                </span>
              </label>

              {/* Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-black text-white font-bold text-lg rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
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
                <span className="px-2 bg-white text-slate-600">
                  already a member?
                </span>
              </div>
            </div>

            {/* Sign In Link */}
            <p className="text-center text-slate-600">
              <Link
                href="/auth/login"
                className="text-black font-bold hover:underline transition"
              >
                Sign in instead
              </Link>
            </p>
          </div>

          {/* Benefits */}
          <div className="mt-8 grid grid-cols-2 gap-4 text-center text-sm text-slate-300">
            <div>
              <Gift className="w-6 h-6 mx-auto text-white mb-2" />
              <p>Welcome Bonus</p>
            </div>
            <div>
              <Zap className="w-6 h-6 mx-auto text-white mb-2" />
              <p>Instant Access</p>
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-linear-to-br from-black via-slate-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">Loading...</p>
          </div>
        </div>
      }
    >
      <Register />
    </Suspense>
  );
}
