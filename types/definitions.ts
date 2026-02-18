export interface IRegisterForm {
  name: string;
  email: string;
  password: string;
}

export interface ILoginForm {
  email: string;
  password: string;
}

export interface IAuthUser {
  id: string;
  email: string;
}

export interface IProfile {
  id: string;
  full_name: string;
  email: string;
  role: "customer" | "admin";
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string[];
  category: string;
}

export interface IPostProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string[];
  category: string;
}

export interface ICartItem {
  id: string;
  cart_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    products:
      | {
          id: string;
          name: string;
          price: number;
          image_url: string[];
          stock: number;
        }
      | Array<{
          id: string;
          name: string;
          price: number;
          image_url: string[];
          stock: number;
        }>
      | null;
  }> | null;
}

export interface IPostCartItems {
  cart_id: string;
  product_id: string;
  quantity: number;
}

export type IOrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "shipped"
  | "completed";

export interface IOrder {
  id: string;
  user_id: string | null;
  status: IOrderStatus | null;
  total_amount: number;
  payment_id: string | null;
  payment_type: string | null;
  shipping_address: string | null;
  snap_token: string | null;
  created_at: string;
}
