import { EmailTemplate } from "../../../components/emailTemplate";
import { Resend } from "resend";
import { NextResponse, NextRequest } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing RESEND_API_KEY. Replace `re_xxxxxxxxx` with your real API key and set it in `.env.local` as RESEND_API_KEY=re_xxxxxxxxx, then restart the dev server.",
      },
      { status: 500 },
    );
  }

  const { name } = (await req.json()) || { name: "Customer" };

  try {
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["suntorom14@gmail.com"],
      subject: "Hello world",
      react: EmailTemplate({ location: name }),
    });

    if (error) {
      // Resend returns useful error info here (message/code/type)
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
