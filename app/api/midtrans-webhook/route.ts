import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { getMidtransServerKey } from "@/lib/midtrans";
import { insertPaymentLog, updateOrderStatus } from "@/services/order";

export const runtime = "nodejs";

type MidtransWebhookPayload = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
};

function isSignatureValid(payload: MidtransWebhookPayload) {
  if (
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }

  const serverKey = getMidtransServerKey();
  const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;

  const hash = crypto.createHash("sha512").update(raw).digest("hex");

  return hash === payload.signature_key;
}

function mapOrderStatus(
  payload: MidtransWebhookPayload,
): "pending" | "paid" | "failed" | null {
  const transactionStatus = payload.transaction_status;

  if (!transactionStatus) {
    return null;
  }

  if (transactionStatus === "settlement") {
    return "paid";
  }

  if (transactionStatus === "capture") {
    return payload.fraud_status === "accept" ? "paid" : "pending";
  }

  if (
    transactionStatus === "deny" ||
    transactionStatus === "cancel" ||
    transactionStatus === "expire" ||
    transactionStatus === "failure"
  ) {
    return "failed";
  }

  if (transactionStatus === "pending") {
    return "pending";
  }

  return null;
}

export async function POST(request: NextRequest) {
  console.log("Received Midtrans webhook");
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body = (payload ?? {}) as Record<string, unknown>;
  const typedPayload: MidtransWebhookPayload = {
    order_id: typeof body.order_id === "string" ? body.order_id : undefined,
    status_code:
      typeof body.status_code === "string" ? body.status_code : undefined,
    gross_amount:
      typeof body.gross_amount === "string" ? body.gross_amount : undefined,
    signature_key:
      typeof body.signature_key === "string" ? body.signature_key : undefined,
    transaction_status:
      typeof body.transaction_status === "string"
        ? body.transaction_status
        : undefined,
    fraud_status:
      typeof body.fraud_status === "string" ? body.fraud_status : undefined,
    transaction_id:
      typeof body.transaction_id === "string" ? body.transaction_id : undefined,
    payment_type:
      typeof body.payment_type === "string" ? body.payment_type : undefined,
  };

  try {
    if (!typedPayload.order_id) {
      return NextResponse.json(
        { error: "Invalid payload", message: "order_id is required" },
        { status: 400 },
      );
    }

    if (!isSignatureValid(typedPayload)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await insertPaymentLog({
      orderId: typedPayload.order_id,
      payload: body,
      transactionStatus: typedPayload.transaction_status,
      externalId: typedPayload.transaction_id,
    });

    const mappedStatus = mapOrderStatus(typedPayload);

    if (mappedStatus) {
      await updateOrderStatus({
        orderId: typedPayload.order_id,
        status: mappedStatus,
        paymentId: typedPayload.transaction_id,
        paymentType: typedPayload.payment_type,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        order_id: typedPayload.order_id,
        order_status: mappedStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { ok: false, error: "Webhook processing failed", message },
      { status: 500 },
    );
  }
}
