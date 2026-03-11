"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, ArrowLeft } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

export default function ProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/store/products/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-2xl bg-black/20" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-[var(--cream-muted)]">Product not found.</p>
        <Link href="/store" className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to Store</Link>
      </div>
    );
  }

  const checkoutUrl = `/checkout?productId=${encodeURIComponent(product.id)}&productName=${encodeURIComponent(product.name)}&amount=${product.price}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link href="/store" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Store
      </Link>

      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black/30 md:aspect-[4/3]">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-24 w-24 text-white/10" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--cream)] md:text-3xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-semibold text-[var(--accent)]">₹{product.price}</p>
          {product.description && (
            <p className="mt-4 whitespace-pre-wrap text-[var(--cream-muted)]">{product.description}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={checkoutUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90"
            >
              Buy now — ₹{product.price}
            </Link>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
