"use server";

import { createSnapTransaction } from "@/lib/midtrans";
import {
  getOrderByIdForCurrentUser,
  processCheckout,
  updateOrderSnapToken,
} from "@/services/order";

type InitCheckoutInput = {
  shippingAddress: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

type InitCheckoutResult = {
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  grossAmount: number;
};

export async function actionInitCheckout(
  payload: InitCheckoutInput,
): Promise<InitCheckoutResult> {
  const orderId = await processCheckout(payload.shippingAddress);

  const order = await getOrderByIdForCurrentUser(orderId);

  if (!order) {
    throw new Error("Order not found after checkout");
  }

  const grossAmount = Number(order.total_amount ?? 0);

  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new Error("Invalid order total amount");
  }

  const transaction = await createSnapTransaction({
    orderId,
    grossAmount,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
  });

  await updateOrderSnapToken({
    orderId,
    snapToken: transaction.token,
  });

  return {
    orderId,
    snapToken: transaction.token,
    redirectUrl: transaction.redirect_url,
    grossAmount,
  };
}
