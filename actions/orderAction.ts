"use server";

import {
  cancelOrderByCurrentUser,
  getAllOrdersForAdmin,
  getCurrentUserOrders,
  getCurrentUserOrderStatus,
  getOrderByIdForAdmin,
  getPaidOrdersForAdmin,
  markOrderCompletedByCurrentUser,
  markOrderShippedByAdmin,
  OrderDetailRecord,
} from "@/services/order";
import { IOrder } from "@/types/definitions";

export async function actionGetCurrentOrderStatus(orderId: string) {
  return getCurrentUserOrderStatus(orderId);
}

export async function actionGetCurrentUserOrders(): Promise<IOrder[]> {
  const orders = await getCurrentUserOrders();
  return orders;
}

export async function actionGetPaidOrdersForAdmin(): Promise<IOrder[]> {
  const orders = await getPaidOrdersForAdmin();
  return orders;
}

export async function actionGetAllOrdersForAdmin(): Promise<IOrder[]> {
  const orders = await getAllOrdersForAdmin();
  return orders;
}

export async function actionGetOrderByIdForAdmin(
  orderId: string,
): Promise<OrderDetailRecord | null> {
  return getOrderByIdForAdmin(orderId);
}

export async function actionMarkOrderShipped(orderId: string): Promise<void> {
  await markOrderShippedByAdmin(orderId);
}

export async function actionMarkOrderCompleted(orderId: string): Promise<void> {
  await markOrderCompletedByCurrentUser(orderId);
}

export async function actionCancelOrder(orderId: string): Promise<void> {
  await cancelOrderByCurrentUser(orderId);
}
