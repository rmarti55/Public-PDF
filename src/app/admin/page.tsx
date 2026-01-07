"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  fileName: string;
  published: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    console.log("[Admin] Fetching documents...");
    try {
      const res = await fetch("/api/documents", {
        headers: { "x-admin-auth": "true" },
      });
      console.log("[Admin] Response status:", res.status);
      
      if (!res.ok) {
        const text = await res.text();
        console.error("[Admin] Error response:", text);
        throw new Error(`Failed to fetch: ${res.status} - ${text}`);
      }
      
      const data = await res.json();
      console.log("[Admin] Fetched", data.length, "documents");
      setDocuments(data);
    } catch (error) {
      console.error("[Admin] Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (doc: Document) => {
    try {
      const formData = new FormData();
      formData.append("title", doc.title);
      formData.append("description", doc.description || "");
      formData.append("category", doc.category || "");
      formData.append("published", (!doc.published).toString());

      await fetch(`/api/documents/${doc.id}`, {
        method: "PUT",
        body: formData,
      });

      fetchDocuments();
    } catch (error) {
      console.error("Error updating document:", error);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <Link
          href="/admin/documents/new"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload New Document
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No documents yet</p>
          <Link
            href="/admin/documents/new"
            className="text-blue-600 hover:underline"
          >
            Upload your first document
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {doc.title}
                      </div>
                      <div className="text-sm text-gray-500">{doc.fileName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {doc.category || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => togglePublished(doc)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        doc.published
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {doc.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-gray-600 hover:text-gray-900"
                      target="_blank"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/documents/${doc.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
