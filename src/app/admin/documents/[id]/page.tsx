"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImageIcon } from "lucide-react";
import { upload } from "@vercel/blob/client";
import AdminLayout from "@/components/AdminLayout";
import DocumentForm, { DocumentFormInitialData } from "@/components/DocumentForm";
import { generateThumbnailFromURL } from "@/lib/pdf-thumbnail";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string;
  filePath: string;
  thumbnailUrl: string | null;
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

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
        setThumbnailUrl(doc.thumbnailUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  const handleRegenerateThumbnail = async () => {
    if (!initialData?.filePath) return;
    
    setRegenerating(true);
    setRegenerateError("");
    setRegenerateSuccess(false);

    try {
      // Generate thumbnail from the PDF
      const thumbnailBlob = await generateThumbnailFromURL(initialData.filePath);
      const thumbnailFile = new File(
        [thumbnailBlob],
        `${initialData.fileName.replace(".pdf", "")}-thumbnail.png`,
        { type: "image/png" }
      );

      // Upload thumbnail to Vercel Blob
      const thumbnailBlobResult = await upload(thumbnailFile.name, thumbnailFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      // Update the document with the new thumbnail URL
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: initialData.title,
          description: initialData.description,
          category: initialData.category,
          context: initialData.context,
          published: initialData.published,
          thumbnailUrl: thumbnailBlobResult.url,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update document with new thumbnail");
      }

      setThumbnailUrl(thumbnailBlobResult.url);
      setRegenerateSuccess(true);
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "Failed to regenerate thumbnail");
    } finally {
      setRegenerating(false);
    }
  };

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

        {/* Thumbnail Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Thumbnail</h2>
          
          <div className="flex items-start gap-6">
            {/* Thumbnail Preview */}
            <div className="w-40 h-52 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Document thumbnail"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <span className="text-xs">No thumbnail</span>
                </div>
              )}
            </div>

            {/* Regenerate Button */}
            <div className="flex-grow">
              <p className="text-sm text-gray-600 mb-4">
                Generate or regenerate the thumbnail from the first page of the PDF document.
              </p>
              
              {regenerateError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {regenerateError}
                </div>
              )}
              
              {regenerateSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Thumbnail regenerated successfully!
                </div>
              )}

              <button
                type="button"
                onClick={handleRegenerateThumbnail}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    {thumbnailUrl ? "Regenerate Thumbnail" : "Generate Thumbnail"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

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
