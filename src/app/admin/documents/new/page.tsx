"use client";

import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import DocumentForm from "@/components/DocumentForm";

export default function NewDocument() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Upload New Document
        </h1>

        <DocumentForm
          mode="create"
          onSuccess={() => router.push("/admin")}
          onCancel={() => router.back()}
        />
      </div>
    </AdminLayout>
  );
}
