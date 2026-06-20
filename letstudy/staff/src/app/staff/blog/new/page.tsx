import { requireStaffModule } from "@/lib/permissions";
import { BlogPostForm } from "../BlogPostForm";

export default async function NewBlogPostPage() {
  await requireStaffModule("CONTENT");
  return <BlogPostForm />;
}
