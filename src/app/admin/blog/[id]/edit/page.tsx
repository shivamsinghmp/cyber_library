import { BlogCmsEditor } from "@/components/BlogCmsEditor";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BlogCmsEditor postId={id} />;
}
