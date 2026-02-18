import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { IconCirclePlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { IPostProduct } from "@/types/definitions";
import { parseIDRToNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useProducts } from "@/lib/store/hookZustand";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { broadcast, CHANNELS, EVENTS } from "@/lib/supabase/realtime";

type PostProductForm = Omit<IPostProduct, "price" | "stock"> & {
  price: string;
  stock: string;
};

export function DialogUpdateProduct({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);

  const { productById, fetchProductById, updateProduct } = useProducts();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PostProductForm>({
    defaultValues: {
      name: "",
      category: "",
      price: "",
      stock: "",
      image_url: [],
      description: "",
    },
  });

  const emptyValues: PostProductForm = {
    name: "",
    category: "",
    price: "",
    stock: "",
    image_url: [],
    description: "",
  };

  // remove local controlled state — use react-hook-form's `reset` to populate fields

  // Fetch product when dialog opens
  useEffect(() => {
    if (open) {
      // clear previous product values so switching products won't keep old inputs
      reset(emptyValues);
      setImagePreviews([]);
      setNewImageUrls([]);
      fetchProductById(id);
    }
  }, [open, id, fetchProductById, reset]);

  useEffect(() => {
    if (!productById) return;

    // Avoid using stale global state from Zustand (e.g., previous dialog)
    // Only populate the form when the fetched product matches the current id.
    if (productById.id !== id) return;

    // fill only empty inputs from fetched product
    const current = getValues();
    reset({
      name: current.name?.trim() ? current.name : productById.name || "",
      category: current.category?.trim()
        ? current.category
        : productById.category || "",
      price: current.price?.trim()
        ? current.price
        : productById.price !== undefined
          ? String(productById.price)
          : "",
      stock: current.stock?.trim()
        ? current.stock
        : productById.stock !== undefined
          ? String(productById.stock)
          : "",
      image_url:
        current.image_url && current.image_url.length > 0
          ? current.image_url
          : productById.image_url || [],
      description: current.description?.trim()
        ? current.description
        : productById.description || "",
    });
  }, [productById, id, getValues, reset]);

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

      // Keep existing images and add new ones (only if productById matches current id)
      const currentImages =
        productById?.id === id ? productById?.image_url || [] : [];
      const allImages = [...currentImages, ...uploadedUrls];

      setNewImageUrls(uploadedUrls);
      setValue("image_url", allImages);
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
      const payload: IPostProduct = {
        ...form,
        price: parseIDRToNumber(form.price),
        stock: Number(form.stock),
      };
      await updateProduct(id, payload);
      toast.success("Product updated successfully");

      // Broadcast stock/product update (non-blocking, don't fail if broadcast fails)
      broadcast(CHANNELS.PRODUCTS, EVENTS.STOCK_UPDATED, {
        productId: id,
      }).catch((err) => {
        console.warn(
          "[Realtime] broadcast failed, but product was updated:",
          err,
        );
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to post product:", error);
      toast.error("Failed to update product");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="hover:underline hover:cursor-pointer hover:scale-110 transition-transform duration-300">
        Update
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Warning</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently update your
            product.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col w-full shadow-md">
          <div className="flex flex-col w-full  border p-4 rounded-md">
            <div className="flex flex-row gap-2 items-center mb-4">
              <IconCirclePlus />
              <h1 className="text-lg font-semibold">Update Product</h1>
            </div>
            <form
              className="grid grid-cols-2 gap-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" {...register("category")} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  {...register("price")}
                  placeholder="1.000.000"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" {...register("stock")} />
              </div>

              <div className="flex flex-col gap-2 col-span-2">
                <Label htmlFor="image">
                  Product Images (upload to add more)
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploadLoading}
                />
                {uploadLoading && (
                  <p className="text-sm text-blue-600">Uploading images...</p>
                )}

                {/* Existing Images - only show when productById matches current id */}
                {productById?.id === id &&
                  productById?.image_url &&
                  productById.image_url.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">
                        Current Images:
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {productById.image_url.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Current ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                {/* New Uploaded Images Preview */}
                {imagePreviews.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">New Images:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`New ${index + 1}`}
                          className="w-full h-24 object-cover rounded border border-green-500"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {newImageUrls.length > 0 && !uploadLoading && (
                  <p className="text-sm text-green-600">
                    ✓ {newImageUrls.length} new image(s) uploaded successfully
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  {...register("description")}
                  className={cn(
                    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
                  )}
                  rows={4}
                />
              </div>

              <div className="col-span-2 flex justify-end mt-2">
                <DialogClose asChild>
                  <Button type="button" className="mr-2">
                    Close
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={uploadLoading}>
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
