import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(req: Request) {
  try {
    // Per-IP rate limit to stop spam/flooding of the support inbox.
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = rateLimit(`support:${ip}`, 5, 600);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name, email (valid), and message (≤5000 chars) are required" },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = parsed.data;

    await prisma.leadSubmission.create({
      data: {
        source: "Support Contact Form",
        data: {
          name,
          email,
          subject: subject || "General Support",
          message,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been received! Our support team will contact you shortly.",
    });
  } catch (error) {
    console.error("Support API Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
