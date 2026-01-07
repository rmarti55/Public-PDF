"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/AdminLayout";
import { Sparkles, Loader2 } from "lucide-react";
import { extractTextFromPDFClient } from "@/lib/pdf-client";

export default function NewDocument() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
      // Extract text from PDF in the browser
      const extractedText = await extractTextFromPDFClient(file);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("Could not extract text from PDF");
      }

      // Send extracted text to API for title generation
      const res = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate title");
      }

      const { title } = await res.json();
      setFormData((prev) => ({ ...prev, title }));
    } catch (err) {
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
      // Extract text from PDF in the browser
      const extractedText = await extractTextFromPDFClient(file);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("Could not extract text from PDF");
      }

      // Send extracted text to API for summarization
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to summarize document");
      }

      const { summary } = await res.json();
      setFormData((prev) => ({ ...prev, description: summary }));
    } catch (err) {
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

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("context", formData.context);
      data.append("published", formData.published.toString());

      const res = await fetch("/api/documents", {
        method: "POST",
        body: data,
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = "Failed to upload document";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Server returned non-JSON (like "Request Entity Too Large")
          errorMessage = text || `Upload failed with status ${res.status}`;
        }
        throw new Error(errorMessage);
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setLoading(false);
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

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
