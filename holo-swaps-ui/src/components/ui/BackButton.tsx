"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";

function BackButtonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (searchParams.get("ref") !== "footer") return null;

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-base text-slate-400 hover:text-white transition-colors mb-8"
    >
      <ArrowLeft size={16} />
      Back
    </button>
  );
}

export function BackButton() {
  return (
    <Suspense fallback={null}>
      <BackButtonInner />
    </Suspense>
  );
}
