import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
    : null;
  const userName = user?.name ?? session?.user?.name ?? "Student";

  return <DashboardContent userName={userName} />;
}
