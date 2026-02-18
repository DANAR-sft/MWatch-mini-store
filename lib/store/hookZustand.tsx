"use client";
import { create } from "zustand";
import { actionGetCurrentUser, actionSignOut } from "../../actions/authAction";
import { actionProfileById } from "@/actions/profilesAction";
import {
  actionGetCartByUserId,
  actionPostToCart,
  actionDeleteCartItem,
} from "@/actions/cartAction";
import {
  IProfile,
  IProduct,
  IAuthUser,
  IPostProduct,
  ICartItem,
  IPostCartItems,
} from "../../types/definitions";
import {
  actionGetAllProducts,
  actionDeleteProduct,
  actionGetProductsById,
  actionPutProduct,
  actionGetProductsByCategory,
  actionGetProductsBySort,
} from "@/actions/productAction";
import { useRouter } from "next/navigation";

type AuthState = {
  user: IAuthUser | null;
  setUser: (user: IAuthUser | null) => void;
  fetchUser: () => Promise<IAuthUser | null>;
  signOut: () => Promise<void>;
};

type ProfileState = {
  profile: IProfile | null;
  setProfile: (profile: IProfile | null) => void;
  fetchProfileById: (id: string) => Promise<IProfile | null>;
};

type ProductsState = {
  products: IProduct[];
  setProducts: (products: IProduct[]) => void;
  fetchProducts: () => Promise<IProduct[]>;
  deleteProduct: (id: string) => Promise<void>;
  productById: IProduct | null;
  setProductById: (productById: IProduct | null) => void;
  fetchProductById: (id: string) => Promise<IProduct | null>;
  updatedProduct: IPostProduct | null;
  setUpdatedProduct: (updatedProduct: IPostProduct | null) => void;
  updateProduct: (
    id: string,
    updatedProduct: IPostProduct,
  ) => Promise<IPostProduct | null>;
  productsByCategory: IProduct[];
  setProductsByCategory: (productsByCategory: IProduct[]) => void;
  fetchProductsByCategory: (category: string) => Promise<IProduct[]>;
  productsBySort: IProduct[];
  setProductsBySort: (productsBySort: IProduct[]) => void;
  fetchProductsBySort: (
    sortBy: string,
    sortOrder: "asc" | "desc",
  ) => Promise<IProduct[]>;
};

type SearchState = {
  isFound: boolean;
  setIsFound: (isFound: boolean) => void;
  isNotFound: boolean;
  setIsNotFound: (isNotFound: boolean) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  allItems: IProduct[];
  setAllItems: (items: IProduct[]) => void;
  items: IProduct[];
  setItems: (items: IProduct[]) => void;
  fetchItems: () => Promise<IProduct[]>;
  temporaryQuery: string;
  setTemporaryQuery: (temporaryQuery: string) => void;
};

type CartState = {
  cart: ICartItem[] | [];
  setCart: (cart: ICartItem[] | []) => void;
  fetchCart: (userId: string) => Promise<ICartItem[] | []>;
  cartItems: ICartItem[] | [];
  setCartItems: (cartItems: ICartItem[] | []) => void;
  postToCart: (item: IPostCartItems) => Promise<ICartItem[] | []>;
  deleteCartItem: (cartItemId: string, userId: string) => Promise<void>;
  updateQuantity: (
    cartId: string,
    productId: string,
    quantity: number,
    userId: string,
  ) => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  fetchUser: async () => {
    const user = await actionGetCurrentUser();
    set({ user: user });
    return user;
  },
  signOut: async () => {
    await actionSignOut();
    set({ user: null });
    useRouter().refresh();
  },
}));

export const useProfile = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  fetchProfileById: async (id: string) => {
    const profile = await actionProfileById(id);
    set({ profile: profile });
    return profile;
  },
}));

export const useProducts = create<ProductsState>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  fetchProducts: async () => {
    const products = await actionGetAllProducts();
    set({ products: products });
    return products;
  },
  productById: null,
  setProductById: (productById) => set({ productById }),
  fetchProductById: async (id: string) => {
    const product = await actionGetProductsById(id);
    set({ productById: product });
    return product;
  },
  productsByCategory: [],
  setProductsByCategory: (productsByCategory) =>
    set({ productsByCategory: productsByCategory }),
  fetchProductsByCategory: async (category: string) => {
    const products = await actionGetProductsByCategory(category);
    set({ productsByCategory: products });
    return products;
  },
  productsBySort: [],
  setProductsBySort: (productsBySort) =>
    set({ productsBySort: productsBySort }),
  fetchProductsBySort: async (sortBy: string, sortOrder: "asc" | "desc") => {
    const products = await actionGetProductsBySort(sortBy, sortOrder);
    set({ productsBySort: products });
    return products;
  },
  deleteProduct: async (id: string) => {
    await actionDeleteProduct(id);
    const products = await actionGetAllProducts();
    set({ products: products });
  },
  updatedProduct: null,
  setUpdatedProduct: (updatedProduct) => set({ updatedProduct }),
  updateProduct: async (id: string, updatedProduct: IPostProduct) => {
    await actionPutProduct(id, updatedProduct);
    const products = await actionGetAllProducts();
    set({ products: products });
    return updatedProduct;
  },
}));

export const useSearch = create<SearchState>((set) => ({
  isFound: false,
  setIsFound: (isFound) => set({ isFound }),
  isNotFound: false,
  setIsNotFound: (isNotFound) => set({ isNotFound }),
  isSearching: false,
  setIsSearching: (isSearching) => set({ isSearching }),
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  allItems: [],
  setAllItems: (items) => set({ allItems: items }),
  temporaryQuery: "",
  setTemporaryQuery: (temporaryQuery) => set({ temporaryQuery }),
  items: [],
  setItems: (items) => set({ items }),
  fetchItems: async () => {
    const items = await actionGetAllProducts();
    return items;
  },
}));

export const useCart = create<CartState>((set) => ({
  cart: [],
  setCart: (cart: ICartItem[] | []) => set({ cart }),
  fetchCart: async (userId: string) => {
    const cart = await actionGetCartByUserId(userId);
    set({ cart: cart });
    return cart;
  },
  cartItems: [],
  setCartItems: (cartItems: ICartItem[] | []) => set({ cartItems }),
  postToCart: async (item: IPostCartItems) => {
    const cart = await actionPostToCart(item);
    set({ cartItems: cart });
    return cart;
  },
  deleteCartItem: async (cartItemId: string, userId: string) => {
    await actionDeleteCartItem(cartItemId);
    const cart = await actionGetCartByUserId(userId);
    set({ cart: cart });
  },
  updateQuantity: async (
    cartId: string,
    productId: string,
    quantity: number,
    userId: string,
  ) => {
    const item: IPostCartItems = {
      cart_id: cartId,
      product_id: productId,
      quantity: quantity,
    };
    await actionPostToCart(item);
    const cart = await actionGetCartByUserId(userId);
    set({ cart: cart });
  },
}));
