import { createAdminClient, createClient } from "@/lib/supabase/server";

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "shipped"
  | "completed";

export type OrderRecord = {
  id: string;
  user_id: string | null;
  status: OrderStatus | null;
  total_amount: number;
  payment_id: string | null;
  payment_type: string | null;
  shipping_address: string | null;
  snap_token: string | null;
  created_at: string;
};

async function assertCurrentUserIsAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden");
  }
}

type CartItemForCheckout = {
  id: string;
  product_id: string;
  quantity: number;
  products:
    | {
        id: string;
        price: number;
        stock: number;
      }
    | {
        id: string;
        price: number;
        stock: number;
      }[]
    | null;
};

function getProductFromCartItem(item: CartItemForCheckout) {
  if (!item.products) return null;
  if (Array.isArray(item.products)) {
    return item.products[0] ?? null;
  }
  return item.products;
}

export async function processCheckout(
  shippingAddress: string,
  shippingMethod: "standard" | "express" = "standard",
): Promise<string> {
  if (!shippingAddress.trim()) {
    throw new Error("shipping_address is required");
  }

  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Get user's cart with items
  const { data: cartData, error: cartError } = await supabase
    .from("carts")
    .select(
      `
      id,
      cart_items (
        id,
        product_id,
        quantity,
        products (
          id,
          price,
          stock
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError) {
    throw new Error(cartError.message);
  }

  if (!cartData) {
    throw new Error("Cart not found");
  }

  const cartItems = (cartData.cart_items ?? []) as CartItemForCheckout[];

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  // 3. Calculate total and validate stock
  let totalAmount = 0;
  for (const item of cartItems) {
    const product = getProductFromCartItem(item);
    if (!product) {
      throw new Error(`Product not found for cart item ${item.id}`);
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for product ${item.product_id}. Available: ${product.stock}, Requested: ${item.quantity}`,
      );
    }

    totalAmount += product.price * item.quantity;
  }

  // Add shipping cost
  const shippingCost = shippingMethod === "express" ? 50000 : 20000;
  totalAmount += shippingCost;

  // 4. Create order
  const admin = createAdminClient();

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      total_amount: totalAmount,
      shipping_address: shippingAddress,
    })
    .select("id")
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  const orderId = orderData.id as string;

  // 5. Create order_items and update product stock
  for (const item of cartItems) {
    const product = getProductFromCartItem(item)!;
    const priceAtPurchase = product.price;

    // Insert order_item
    const { error: itemError } = await admin.from("order_items").insert({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: priceAtPurchase,
    });

    if (itemError) {
      throw new Error(`Failed to create order item: ${itemError.message}`);
    }

    // Update product stock
    const newStock = product.stock - item.quantity;
    const { error: stockError } = await admin
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.product_id);

    if (stockError) {
      throw new Error(`Failed to update stock: ${stockError.message}`);
    }
  }

  // 6. Clear cart items
  const cartItemIds = cartItems.map((item) => item.id);
  const { error: deleteError } = await admin
    .from("cart_items")
    .delete()
    .in("id", cartItemIds);

  if (deleteError) {
    throw new Error(`Failed to clear cart: ${deleteError.message}`);
  }

  return orderId;
}

export async function getOrderByIdForCurrentUser(
  orderId: string,
): Promise<OrderRecord | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, status, total_amount, payment_id, payment_type, shipping_address, snap_token, created_at",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OrderRecord | null;
}

export async function updateOrderSnapToken(params: {
  orderId: string;
  snapToken: string;
}) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("orders")
    .update({
      snap_token: params.snapToken,
    })
    .eq("id", params.orderId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateOrderStatus(params: {
  orderId: string;
  status: OrderStatus;
  paymentId?: string;
  paymentType?: string;
}) {
  const admin = createAdminClient();

  const patch: {
    status: OrderStatus;
    payment_id?: string;
    payment_type?: string;
  } = {
    status: params.status,
  };

  if (params.paymentId !== undefined) {
    patch.payment_id = params.paymentId;
  }

  if (params.paymentType !== undefined) {
    patch.payment_type = params.paymentType;
  }

  const { error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", params.orderId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertPaymentLog(params: {
  orderId: string;
  payload: Record<string, unknown>;
  transactionStatus?: string;
  externalId?: string;
}) {
  const admin = createAdminClient();

  const { error } = await admin.from("payment_logs").insert({
    order_id: params.orderId,
    external_id: params.externalId ?? null,
    status: params.transactionStatus ?? null,
    raw_payload: params.payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUserOrderStatus(
  orderId: string,
): Promise<OrderStatus | null> {
  const order = await getOrderByIdForCurrentUser(orderId);
  return order?.status ?? null;
}

export async function getCurrentUserOrders(): Promise<OrderRecord[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, user_id, status, total_amount, payment_id, payment_type, shipping_address, snap_token, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderRecord[];
}

export async function getPaidOrdersForAdmin(): Promise<OrderRecord[]> {
  await assertCurrentUserIsAdmin();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, user_id, status, total_amount, payment_id, payment_type, shipping_address, snap_token, created_at",
    )
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderRecord[];
}

export async function getAllOrdersForAdmin(): Promise<OrderRecord[]> {
  await assertCurrentUserIsAdmin();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      "id, user_id, status, total_amount, payment_id, payment_type, shipping_address, snap_token, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderRecord[];
}

export async function markOrderShippedByAdmin(orderId: string) {
  await assertCurrentUserIsAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Order not found");
  }

  if (data.status !== "paid") {
    throw new Error("Only paid orders can be shipped");
  }

  await updateOrderStatus({ orderId, status: "shipped" });
}

export async function markOrderCompletedByCurrentUser(orderId: string) {
  const order = await getOrderByIdForCurrentUser(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "shipped") {
    throw new Error("Order must be shipped before completion");
  }

  await updateOrderStatus({ orderId, status: "completed" });
}

export async function cancelOrderByCurrentUser(orderId: string) {
  const order = await getOrderByIdForCurrentUser(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "pending") {
    throw new Error("Only pending orders can be cancelled");
  }

  await updateOrderStatus({ orderId, status: "failed" });
}

export type OrderItemWithProduct = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  products: {
    id: string;
    name: string;
    image_url: string[];
  } | null;
};

export type OrderDetailRecord = OrderRecord & {
  order_items: OrderItemWithProduct[];
  profiles: {
    full_name: string;
    email: string;
  } | null;
};

export async function getOrderByIdForAdmin(
  orderId: string,
): Promise<OrderDetailRecord | null> {
  await assertCurrentUserIsAdmin();

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      `
      id, user_id, status, total_amount, payment_id, payment_type, shipping_address, snap_token, created_at,
      order_items (
        id,
        product_id,
        quantity,
        price_at_purchase,
        products (
          id,
          name,
          image_url
        )
      ),
      profiles (
        full_name,
        email
      )
    `,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return data as unknown as OrderDetailRecord;
}
