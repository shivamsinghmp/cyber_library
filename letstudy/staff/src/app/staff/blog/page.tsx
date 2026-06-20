import { requireStaffModule } from "@/lib/permissions";
import BlogListClient from "./BlogListClient";

export default async function StaffBlogPage() {
  await requireStaffModule("CONTENT");
  return <BlogListClient />;
}
