"use server";
import {
  getAllProducts,
  getProductsById,
  getProductsByCategory,
  getProductsBySort,
  postProduct,
  // postProductImage,
  deleteProduct,
  putProduct,
  uploadImage,
} from "@/services/product";
import { IProduct, IPostProduct } from "@/types/definitions";

export async function actionGetAllProducts(): Promise<IProduct[] | []> {
  return await getAllProducts();
}

export async function actionGetProductsById(
  id: string,
): Promise<IProduct | null> {
  return await getProductsById(id);
}

export async function actionGetProductsByCategory(
  category: string,
): Promise<IProduct[] | []> {
  return await getProductsByCategory(category);
}

export async function actionGetProductsBySort(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Promise<IProduct[] | []> {
  return await getProductsBySort(sortBy, sortOrder);
}

export async function actionPostProduct(
  data: IPostProduct,
): Promise<IPostProduct | null> {
  return await postProduct(data);
}

export async function actionUploadImage(
  formData: FormData,
): Promise<string | null> {
  const file = formData.get("file") as File;
  if (!file) {
    return null;
  }
  return await uploadImage(file);
}

// export async function actionPostProductImage(id: string, image: File) {
//   return await postProductImage(id, image);
// }

export async function actionPutProduct(
  id: string,
  data: IPostProduct,
): Promise<IPostProduct | null> {
  return await putProduct(id, data);
}

export async function actionDeleteProduct(id: string): Promise<boolean> {
  return await deleteProduct(id);
}
