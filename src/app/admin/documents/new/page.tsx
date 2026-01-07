"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { Sparkles, Loader2 } from "lucide-react";
import { extractTextFromPDFClient } from "@/lib/pdf-client";
import { upload } from "@vercel/blob/client";

export default function NewDocument() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    context: "",
    published: false,
  });
  const [file, setFile] = useState<File | null>(null);

  const handleAIGenerateTitle = async () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setGeneratingTitle(true);
    setError("");

    try {
      console.log("[Generate Title] Extracting text from PDF...");
      const extractedText = await extractTextFromPDFClient(file);
      console.log("[Generate Title] Extracted text length:", extractedText?.length || 0);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("Could not extract text from PDF");
      }

      const truncatedText = extractedText.slice(0, 5000);
      console.log("[Generate Title] Truncated to:", truncatedText.length, "chars");

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
      console.log("[Generate Title] Success:", title);
      setFormData((prev) => ({ ...prev, title }));
    } catch (err) {
      console.error("[Generate Title] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate title");
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleAISummarize = async () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setSummarizing(true);
    setError("");

    try {
      console.log("[Summarize] Extracting text from PDF...");
      const extractedText = await extractTextFromPDFClient(file);
      console.log("[Summarize] Extracted text length:", extractedText?.length || 0);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("Could not extract text from PDF");
      }

      const truncatedText = extractedText.slice(0, 10000);
      console.log("[Summarize] Truncated to:", truncatedText.length, "chars");

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
      console.log("[Summarize] Success, length:", summary?.length || 0);
      setFormData((prev) => ({ ...prev, description: summary }));
    } catch (err) {
      console.error("[Summarize] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to summarize document");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    setLoading(true);
    setError("");
    setUploadProgress(0);

    console.log("[Upload] Starting upload...");
    console.log("[Upload] File:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    try {
      // Step 1: Upload file directly to Vercel Blob (bypasses serverless function limit)
      setUploadStatus("Uploading file to storage...");
      console.log("[Upload] Step 1: Direct upload to Vercel Blob...");
      
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: true, // Enable multipart for large files
        onUploadProgress: ({ percentage }) => {
          setUploadProgress(Math.round(percentage));
          console.log("[Upload] Progress:", Math.round(percentage) + "%");
        },
      });
      
      console.log("[Upload] Blob uploaded:", blob.url);

      // Step 2: Extract text from PDF in the browser
      setUploadStatus("Extracting text from PDF...");
      setUploadProgress(0);
      console.log("[Upload] Step 2: Extracting text client-side...");
      
      let extractedText = "";
      try {
        extractedText = await extractTextFromPDFClient(file);
        console.log("[Upload] Extracted text length:", extractedText.length);
      } catch (extractError) {
        console.warn("[Upload] Text extraction failed:", extractError);
        // Continue without extracted text
      }

      // Truncate for storage (500K chars max for LLM context)
      const truncatedText = extractedText.slice(0, 500000);
      console.log("[Upload] Truncated text for storage:", truncatedText.length, "chars");

      // Step 3: Send metadata to API (small payload, no file)
      setUploadStatus("Saving document...");
      console.log("[Upload] Step 3: Sending metadata to API...");
      
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          context: formData.context,
          published: formData.published,
          fileName: file.name,
          filePath: blob.url,
          extractedText: truncatedText,
        }),
      });

      console.log("[Upload] API response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save document");
      }

      console.log("[Upload] Success! Redirecting...");
      router.push("/admin");
    } catch (err) {
      console.error("[Upload] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setLoading(false);
      setUploadStatus("");
      setUploadProgress(0);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Upload New Document
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF File *
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              required
            />
            {file && (
              <p className="text-sm text-gray-500 mt-1">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <button
                type="button"
                onClick={handleAIGenerateTitle}
                disabled={generatingTitle || !file}
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Document title"
              required
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <button
                type="button"
                onClick={handleAISummarize}
                disabled={summarizing || !file}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {summarizing ? (
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
                Publish immediately
              </span>
            </label>
          </div>

          {/* Upload Progress */}
          {loading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{uploadStatus}</span>
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

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
