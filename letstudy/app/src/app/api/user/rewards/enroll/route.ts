import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Direct reward enrollment is disabled for security reasons." }, { status: 403 });
}
