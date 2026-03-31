import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, message, subject } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

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
