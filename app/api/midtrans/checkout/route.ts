import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSnapTransaction } from "@/lib/midtrans";
import {
  getOrderByIdForCurrentUser,
  processCheckout,
  updateOrderSnapToken,
} from "@/services/order";

export const runtime = "nodejs";

const CheckoutSchema = z
  .object({
    shipping_address: z.string().min(1),
    full_name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    shipping_method: z
      .enum(["standard", "express"])
      .optional()
      .default("standard"),
  })
  .strict();

export async function POST(request: NextRequest) {
  console.log("Received checkout request");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const orderId = await processCheckout(
      parsed.data.shipping_address,
      parsed.data.shipping_method,
    );

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
      fullName: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    });

    await updateOrderSnapToken({
      orderId,
      snapToken: transaction.token,
    });

    return NextResponse.json(
      {
        order_id: orderId,
        snap_token: transaction.token,
        redirect_url: transaction.redirect_url,
        gross_amount: grossAmount,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: "Checkout failed", message }, { status });
  }
}
