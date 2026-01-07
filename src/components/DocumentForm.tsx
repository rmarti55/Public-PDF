"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { extractTextFromPDFClient } from "@/lib/pdf-client";
import { generateThumbnailFromPDF } from "@/lib/pdf-thumbnail";
import { upload } from "@vercel/blob/client";

export interface DocumentFormData {
  title: string;
  description: string;
  category: string;
  context: string;
  published: boolean;
}

export interface DocumentFormInitialData extends DocumentFormData {
  fileName: string;
  filePath: string;
}

interface DocumentFormProps {
  mode: "create" | "edit";
  documentId?: string;
  initialData?: DocumentFormInitialData;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DocumentForm({
  mode,
  documentId,
  initialData,
  onSuccess,
  onCancel,
}: DocumentFormProps) {
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<DocumentFormData>({
    title: "",
    description: "",
    category: "",
    context: "",
    published: false,
  });
  const [file, setFile] = useState<File | null>(null);

  // Initialize form data from initialData (edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        context: initialData.context,
        published: initialData.published,
      });
    }
  }, [initialData]);

  // Upload file to Vercel Blob (with server fallback)
  const uploadFile = async (fileToUpload: File): Promise<string> => {
    try {
      setUploadStatus("Uploading file to storage...");
      const blob = await upload(fileToUpload.name, fileToUpload, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: true,
        onUploadProgress: ({ percentage }) => {
          setUploadProgress(Math.round(percentage));
        },
      });
      return blob.url;
    } catch (uploadError) {
      // Fallback to server upload
      console.log("[Upload] Direct upload failed, falling back to server upload...", uploadError);
      setUploadStatus("Uploading via server...");
      
      const formDataUpload = new FormData();
      formDataUpload.append("file", fileToUpload);
      
      const uploadRes = await fetch("/api/upload-server", {
        method: "POST",
        body: formDataUpload,
      });
      
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        if (text.includes("Too Large") || text.includes("PAYLOAD")) {
          throw new Error("File too large. Add BLOB_READ_WRITE_TOKEN for large files.");
        }
        try {
          const err = JSON.parse(text);
          throw new Error(err.error || "Upload failed");
        } catch {
          throw new Error(text || "Upload failed");
        }
      }
      
      const { url } = await uploadRes.json();
      return url;
    }
  };

  // Generate title with AI
  const handleGenerateTitle = async () => {
    setGeneratingTitle(true);
    setError("");

    try {
      if (mode === "edit" && documentId) {
        // Edit mode: use stored document text via API
        const res = await fetch(`/api/documents/${documentId}/generate-title`, {
          method: "POST",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to generate title");
        }
        const { title } = await res.json();
        setFormData((prev) => ({ ...prev, title }));
      } else {
        // Create mode: extract text from uploaded file
        if (!file) {
          setError("Please select a PDF file first");
          return;
        }
        const extractedText = await extractTextFromPDFClient(file);
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Could not extract text from PDF");
        }
        const truncatedText = extractedText.slice(0, 5000);
        const res = await fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: truncatedText }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to generate title");
        }
        const { title } = await res.json();
        setFormData((prev) => ({ ...prev, title }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate title");
    } finally {
      setGeneratingTitle(false);
    }
  };

  // Generate description with AI
  const handleGenerateDescription = async () => {
    setGeneratingDescription(true);
    setError("");

    try {
      if (mode === "edit" && documentId) {
        // Edit mode: use stored document text via API
        const res = await fetch(`/api/documents/${documentId}/generate-description`, {
          method: "POST",
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to generate description");
        }
        const { description } = await res.json();
        setFormData((prev) => ({ ...prev, description }));
      } else {
        // Create mode: extract text from uploaded file
        if (!file) {
          setError("Please select a PDF file first");
          return;
        }
        const extractedText = await extractTextFromPDFClient(file);
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("Could not extract text from PDF");
        }
        const truncatedText = extractedText.slice(0, 10000);
        const res = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: truncatedText }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to summarize document");
        }
        const { summary } = await res.json();
        setFormData((prev) => ({ ...prev, description: summary }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate description");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate file for create mode
    if (mode === "create" && !file) {
      setError("Please select a PDF file");
      return;
    }

    setSaving(true);
    setError("");
    setUploadProgress(0);

    try {
      let filePath = initialData?.filePath || "";
      let fileName = initialData?.fileName || "";
      let extractedText: string | undefined;
      let thumbnailUrl: string | undefined;

      // Upload file if provided
      if (file) {
        filePath = await uploadFile(file);
        fileName = file.name;

        // Extract text from PDF
        setUploadStatus("Extracting text from PDF...");
        setUploadProgress(0);
        try {
          const text = await extractTextFromPDFClient(file);
          extractedText = text.slice(0, 500000); // Truncate for storage
        } catch (extractError) {
          console.warn("[Upload] Text extraction failed:", extractError);
        }

        // Generate thumbnail from first page
        setUploadStatus("Generating thumbnail...");
        try {
          const thumbnailBlob = await generateThumbnailFromPDF(file);
          const thumbnailFile = new File(
            [thumbnailBlob],
            `${file.name.replace(".pdf", "")}-thumbnail.png`,
            { type: "image/png" }
          );
          
          // Upload thumbnail to Vercel Blob
          setUploadStatus("Uploading thumbnail...");
          const thumbnailBlobResult = await upload(thumbnailFile.name, thumbnailFile, {
            access: "public",
            handleUploadUrl: "/api/upload",
          });
          thumbnailUrl = thumbnailBlobResult.url;
        } catch (thumbnailError) {
          console.warn("[Upload] Thumbnail generation failed:", thumbnailError);
          // Continue without thumbnail - not critical
        }
      }

      // Submit to API
      setUploadStatus(mode === "create" ? "Saving document..." : "Saving changes...");

      if (mode === "create") {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            context: formData.context,
            published: formData.published,
            fileName,
            filePath,
            extractedText,
            thumbnailUrl,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to save document");
        }
      } else {
        // Edit mode
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            context: formData.context,
            published: formData.published,
            ...(file && {
              fileName,
              filePath,
              extractedText,
              thumbnailUrl,
            }),
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to update document");
        }
      }

      onSuccess();
    } catch (err) {
      console.error("[DocumentForm] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSaving(false);
      setUploadStatus("");
      setUploadProgress(0);
    }
  };

  const isCreate = mode === "create";
  const canGenerateAI = isCreate ? !!file : true;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Current File (edit mode only) */}
      {!isCreate && initialData && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current File
          </label>
          <p className="text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            {initialData.fileName}
          </p>
        </div>
      )}

      {/* PDF File Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isCreate ? "PDF File *" : "Replace PDF (optional)"}
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          required={isCreate}
        />
        {file && (
          <p className="text-sm text-gray-500 mt-1">
            {isCreate ? "" : "New file: "}
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        {!isCreate && !file && (
          <p className="text-sm text-gray-500 mt-1">
            Leave empty to keep the current file
          </p>
        )}
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <button
            type="button"
            onClick={handleGenerateTitle}
            disabled={generatingTitle || !canGenerateAI}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingTitle ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI Generate
              </>
            )}
          </button>
        </div>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Document title"
          required
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <button
            type="button"
            onClick={handleGenerateDescription}
            disabled={generatingDescription || !canGenerateAI}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatingDescription ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI Summarize
              </>
            )}
          </button>
        </div>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          rows={3}
          placeholder="Brief description of the document"
        />
      </div>

      {/* Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <input
          type="text"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="e.g., Budget, Policy, Meeting Minutes"
        />
      </div>

      {/* Context */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Context / Background Information
        </label>
        <textarea
          value={formData.context}
          onChange={(e) =>
            setFormData({ ...formData, context: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          rows={6}
          placeholder="Add background information, key points, related links, etc. (supports HTML)"
        />
        <p className="text-sm text-gray-500 mt-1">
          This will be displayed alongside the document to provide additional
          context.
        </p>
      </div>

      {/* Published */}
      <div className="mb-8">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.published}
            onChange={(e) =>
              setFormData({ ...formData, published: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            {isCreate ? "Publish immediately" : "Published"}
          </span>
        </label>
      </div>

      {/* Upload Progress */}
      {saving && uploadStatus && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {uploadStatus}
            </span>
            {uploadProgress > 0 && (
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving
            ? isCreate
              ? "Uploading..."
              : "Saving..."
            : isCreate
              ? "Upload Document"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
