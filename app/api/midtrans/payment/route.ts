import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSnapTransaction } from "@/lib/midtrans";
import {
  getOrderByIdForCurrentUser,
  updateOrderSnapToken,
} from "@/services/order";

export const runtime = "nodejs";

const PaymentSchema = z
  .object({
    order_id: z.string().min(1),
  })
  .strict();

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const parsed = PaymentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const order = await getOrderByIdForCurrentUser(parsed.data.order_id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          error: "Order is not pending",
          order_id: order.id,
          status: order.status,
        },
        { status: 409 },
      );
    }

    if (order.snap_token) {
      return NextResponse.json(
        {
          order_id: order.id,
          snap_token: order.snap_token,
          redirect_url: null,
          gross_amount: order.total_amount,
          status: order.status,
        },
        { status: 200 },
      );
    }

    const transaction = await createSnapTransaction({
      orderId: order.id,
      grossAmount: Number(order.total_amount),
    });

    await updateOrderSnapToken({
      orderId: order.id,
      snapToken: transaction.token,
    });

    return NextResponse.json(
      {
        order_id: order.id,
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
        gross_amount: order.total_amount,
        status: order.status,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json(
      { error: "Payment init failed", message },
      { status },
    );
  }
}
