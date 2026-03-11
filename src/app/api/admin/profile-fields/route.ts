import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const role = (u: unknown) => (u as { role?: string })?.role;
const ROLES = ["STUDENT", "EMPLOYEE", "AUTHOR"] as const;
const TYPES = ["text", "number", "email", "textarea", "select"] as const;

/** GET: List profile field definitions, optionally by role. Query: ?role=STUDENT */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const where = roleFilter && ROLES.includes(roleFilter as (typeof ROLES)[number])
      ? { role: roleFilter }
      : {};
    const list = await prisma.profileFieldDefinition.findMany({
      where,
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }, { key: "asc" }],
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/admin/profile-fields:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const createSchema = z.object({
  role: z.enum(ROLES),
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Key: only lowercase letters, numbers, underscore"),
  label: z.string().min(1).max(200),
  type: z.enum(TYPES),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

/** POST: Create a profile field definition */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const existing = await prisma.profileFieldDefinition.findUnique({
      where: { role_key: { role: data.role, key: data.key } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A field with this key already exists for this role" },
        { status: 400 }
      );
    }
    const created = await prisma.profileFieldDefinition.create({
      data: {
        role: data.role,
        key: data.key,
        label: data.label,
        type: data.type,
        required: data.required,
        // Cast options to any to satisfy Prisma's JSON type
        options:
          data.options === undefined
            ? null
            : ((data.options ?? null) as any),
        sortOrder: data.sortOrder,
      } as any,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/profile-fields:", e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
