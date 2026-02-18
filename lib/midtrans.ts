import midtransClient from "midtrans-client";

export type MidtransSnapResponse = {
  token: string;
  redirect_url: string;
};

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) {
    throw new Error("Missing MIDTRANS_SERVER_KEY");
  }

  if (!clientKey) {
    throw new Error("Missing NEXT_PUBLIC_MIDTRANS_CLIENT_KEY");
  }

  return { serverKey, clientKey, isProduction };
}

export function createMidtransSnapClient() {
  const config = getMidtransConfig();

  return new midtransClient.Snap({
    isProduction: config.isProduction,
    serverKey: config.serverKey,
    clientKey: config.clientKey,
  });
}

export function getMidtransServerKey() {
  return getMidtransConfig().serverKey;
}

export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  fullName?: string;
  email?: string;
  phone?: string;
}): Promise<MidtransSnapResponse> {
  const snap = createMidtransSnapClient();
  const transactionPayload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
      phone: params.phone,
    },
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cart/payment-success?order_id=${params.orderId}`,
      error: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cart/payment-failed?order_id=${params.orderId}`,
      pending: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cart/payment-pending?order_id=${params.orderId}`,
    },
  };

  return snap.createTransaction(
    transactionPayload as unknown as Parameters<
      typeof snap.createTransaction
    >[0],
  ) as Promise<MidtransSnapResponse>;
}
