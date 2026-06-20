import { notFound } from "next/navigation";
import { requireStaffModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BlogPostForm } from "../../BlogPostForm";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffModule("CONTENT");
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <BlogPostForm
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        coverImage: post.coverImage,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      }}
    />
  );
}
