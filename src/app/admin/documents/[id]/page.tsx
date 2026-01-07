"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import DocumentForm, { DocumentFormInitialData } from "@/components/DocumentForm";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string;
  filePath: string;
  context: string | null;
  published: boolean;
}

export default function EditDocument({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialData, setInitialData] = useState<DocumentFormInitialData | null>(null);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const res = await fetch(`/api/documents/${id}`, {
          headers: { "x-admin-auth": "true" },
        });
        if (!res.ok) throw new Error("Document not found");

        const doc: Document = await res.json();
        setInitialData({
          title: doc.title,
          description: doc.description || "",
          category: doc.category || "",
          context: doc.context || "",
          published: doc.published,
          fileName: doc.fileName,
          filePath: doc.filePath,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !initialData) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error || "Failed to load document"}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Document</h1>

        <DocumentForm
          mode="edit"
          documentId={id}
          initialData={initialData}
          onSuccess={() => router.push("/admin")}
          onCancel={() => router.back()}
        />
      </div>
    </AdminLayout>
  );
}
