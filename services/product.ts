import { createClient } from "@/lib/supabase/server";
import { IProduct, IPostProduct } from "@/types/definitions";

export async function uploadImage(file: File): Promise<string | null> {
  const supabase = await createClient();

  // Generate unique filename using timestamp and original filename
  const fileExt = file.name.split(".").pop();
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  try {
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("products")
      .upload(uniqueFileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("products").getPublicUrl(uploadData.path);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
}

export async function getAllProducts(): Promise<IProduct[] | []> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, description, price, stock, image_url, category, created_at",
    );

  if (error) {
    console.log("Error fetching products:", error.message);
    return [];
  }
  return data;
}

export async function getProductsById(id: string): Promise<IProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, stock, image_url, category")
    .eq("id", id)
    .single();

  if (error) {
    console.log("Error fetching product by id:", error.message);
    return null;
  }
  return data;
}

export async function getProductsByCategory(
  category: string,
): Promise<IProduct[] | []> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, stock, image_url, category")
    .eq("category", category);
  if (error) {
    console.log("Error fetching products by category:", error.message);
    return [];
  }
  return data;
}

export async function getProductsBySort(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Promise<IProduct[] | []> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, stock, image_url, category")
    .order(sortBy, { ascending: sortOrder === "asc" });
  if (error) {
    console.log("Error fetching products by sort:", error.message);
    return [];
  }
  return data;
}

export async function postProduct({
  name,
  description,
  price,
  stock,
  image_url,
  category,
}: IPostProduct): Promise<IPostProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name: name,
        description: description,
        price: price,
        stock: stock,
        image_url: image_url,
        category: category,
      },
    ])
    .select()
    .single();

  if (error) {
    console.log("Error posting product:", error.message);
    return null;
  }
  return data;
}

// export async function postProductImage(
//   id: string,
//   image: File,
// ): Promise<IPostProduct | null> {
//   const supabase = await createClient();
//   const { data, error } = await supabase
//     .from("products")
//     .update({ image_url: imageUrl })
//     .eq("id", id)
//     .select()
//     .single();
//   if (error) {
//     console.log("Error posting product image:", error.message);
//     return null;
//   }
//   return data;
// }

export async function putProduct(
  id: string,
  { name, description, price, stock, image_url, category }: IPostProduct,
): Promise<IPostProduct | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .upsert({ id, name, description, price, stock, image_url, category })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.log("Error updating product:", error.message);
    return null;
  }
  return data;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.log("Error deleting product:", error.message);
    return false;
  }
  return true;
}
