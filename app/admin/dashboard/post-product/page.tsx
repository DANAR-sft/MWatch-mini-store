"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/store/hookZustand";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn, parseIDRToNumber } from "@/lib/utils";
import type { IPostProduct } from "@/types/definitions";
import { useForm } from "react-hook-form";
import { actionPostProduct } from "@/actions/productAction";
import { createClient } from "@/lib/supabase/client";
import { Plus, Upload, Check, Package } from "lucide-react";
import { toast } from "sonner";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";

type PostProductForm = Omit<IPostProduct, "price" | "stock"> & {
  price: string;
  stock: string;
};

export default function Page() {
  const { profile } = useProfile();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PostProductForm>();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== "admin") {
      router.push("/");
    }
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Create previews
    const previews: string[] = [];
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === fileArray.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });

    // Upload all files to Supabase Storage
    setUploadLoading(true);
    try {
      const supabase = createClient();
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        // Upload file
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("products")
          .upload(uniqueFileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Upload failed for ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("products").getPublicUrl(uploadData.path);

        uploadedUrls.push(publicUrl);
      }

      setImageUrls(uploadedUrls);
      setValue("image_url", uploadedUrls);
      console.log("Upload successful:", uploadedUrls);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `Failed to upload images: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setUploadLoading(false);
    }
  }

  async function onSubmit(form: PostProductForm) {
    try {
      if (imageUrls.length === 0) {
        toast.error("Please upload at least one image");
        return;
      }

      const payload: IPostProduct = {
        ...form,
        price: parseIDRToNumber(form.price),
        stock: Number(form.stock),
        image_url: imageUrls,
      };
      await actionPostProduct(payload);
      toast.success("Product created successfully!");

      // Broadcast product creation so other pages can refresh (non-blocking)
      broadcast(CHANNELS.PRODUCTS, EVENTS.PRODUCT_CREATED, {}).catch((err) => {
        console.warn("[Realtime] broadcast failed:", err);
      });

      router.push("/admin/dashboard");
    } catch (error) {
      console.error("Failed to post product:", error);
      toast.error("Failed to create product");
    }
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
          {/* Header Section */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-black text-white p-2 rounded-lg">
                <Plus className="w-6 h-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-black">
                Add New Product
              </h1>
            </div>
            <p className="text-slate-600">
              Create and list a new product in your inventory
            </p>
          </div>

          {/* Form Card */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 md:p-12 shadow-sm">
              <form
                className="space-y-8"
                onSubmit={handleSubmit((data) => onSubmit(data))}
              >
                {/* Product Basic Info */}
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Basic Information
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-black">
                        Product Name *
                      </label>
                      <Input
                        id="name"
                        placeholder="e.g., Premium Wireless Headphones"
                        className="border-2 border-slate-300 rounded-lg py-3 px-4 focus:border-black focus:outline-none transition-all"
                        {...register("name", { required: "Name is required" })}
                      />
                      {errors?.name && (
                        <span className="text-sm text-red-600">
                          {errors.name.message}
                        </span>
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-black">
                        Category *
                      </label>
                      <Input
                        id="category"
                        placeholder="e.g., Electronics"
                        className="border-2 border-slate-300 rounded-lg py-3 px-4 focus:border-black focus:outline-none transition-all"
                        {...register("category", {
                          required: "Category is required",
                        })}
                      />
                      {errors?.category && (
                        <span className="text-sm text-red-600">
                          {errors.category.message}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-black">
                        Price (IDR) *
                      </label>
                      <Input
                        id="price"
                        inputMode="numeric"
                        placeholder="1.000.000"
                        className="border-2 border-slate-300 rounded-lg py-3 px-4 focus:border-black focus:outline-none transition-all"
                        {...register("price", {
                          required: "Price is required",
                        })}
                      />
                      {errors?.price && (
                        <span className="text-sm text-red-600">
                          {errors.price.message}
                        </span>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-black">
                        Stock Quantity *
                      </label>
                      <Input
                        id="stock"
                        type="number"
                        placeholder="100"
                        className="border-2 border-slate-300 rounded-lg py-3 px-4 focus:border-black focus:outline-none transition-all"
                        {...register("stock", {
                          required: "Stock is required",
                        })}
                      />
                      {errors?.stock && (
                        <span className="text-sm text-red-600">
                          {errors.stock.message}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Images Upload */}
                <div className="space-y-6 border-t pt-8">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Product Images
                  </h2>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-black">
                      Upload Images *
                    </label>
                    <div className="relative">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploadLoading}
                        className="border-2 border-dashed border-slate-300 rounded-lg py-8 px-4 cursor-pointer hover:border-black transition-colors"
                      />
                      {uploadLoading && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded-lg">
                          <div className="text-sm text-blue-700 font-medium flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                            Uploading images...
                          </div>
                        </div>
                      )}

                      {/* Image Previews */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-black mb-3">
                            Image Preview ({imagePreviews.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {imagePreviews.map((preview, index) => (
                              <div
                                key={index}
                                className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-black transition"
                              >
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload Success */}
                      {imageUrls.length > 0 && !uploadLoading && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                          <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {imageUrls.length} image(s) uploaded successfully
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-6 border-t pt-8">
                  <h2 className="text-xl font-bold text-black">Description</h2>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-black">
                      Product Description *
                    </label>
                    <textarea
                      id="description"
                      placeholder="Write a detailed description of your product..."
                      className={cn(
                        "w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 focus:border-black focus:outline-none transition-all",
                      )}
                      rows={4}
                      {...register("description", {
                        required: "Description is required",
                      })}
                    />
                    {errors?.description && (
                      <span className="text-sm text-red-600">
                        {errors.description.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 border-t pt-8">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border-2 border-slate-300 text-black font-bold rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadLoading || imageUrls.length === 0}
                    className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed transition hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
