"use client";

import { useState } from "react";

interface ContextSidebarProps {
  documentId: string;
  title: string;
  description: string | null;
  category: string | null;
  context: string | null;
  createdAt: string;
  editable?: boolean;
}

export default function ContextSidebar({
  documentId,
  title,
  description,
  category,
  context,
  createdAt,
  editable = false,
}: ContextSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title,
    description: description || "",
    category: category || "",
    context: context || "",
  });
  const [currentData, setCurrentData] = useState({
    title,
    description,
    category,
    context,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("category", formData.category);
      data.append("context", formData.context);
      data.append("published", "true");

      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        body: data,
      });

      if (!res.ok) throw new Error("Failed to save");

      setCurrentData({
        title: formData.title,
        description: formData.description || null,
        category: formData.category || null,
        context: formData.context || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: currentData.title,
      description: currentData.description || "",
      category: currentData.category || "",
      context: currentData.context || "",
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        {/* Edit Toggle Button */}
        {editable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="mb-4 flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Details
          </button>
        )}

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Title Field */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Title
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-xl font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{currentData.title}</h1>
          )}
        </div>

        {/* Category Field */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Category
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Budget, Policy, Minutes"
              className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : currentData.category ? (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              {currentData.category}
            </span>
          ) : (
            <span className="text-sm text-gray-400 italic">No category</span>
          )}
        </div>

        {/* Description Field */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Description
          </label>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the document"
              rows={3}
              className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          ) : currentData.description ? (
            <p className="text-gray-600 text-sm">{currentData.description}</p>
          ) : (
            <span className="text-sm text-gray-400 italic">No description</span>
          )}
        </div>

        {/* Date Published Field */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Date Published
          </label>
          <p className="text-sm text-gray-600">
            {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Context Section */}
      <div className="flex-1 overflow-auto p-6">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Background & Context
        </label>
        {isEditing ? (
          <textarea
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            placeholder="Add background information, key points, related links, etc. (supports HTML)"
            rows={10}
            className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        ) : currentData.context ? (
          <div
            className="prose prose-sm max-w-none text-gray-600"
            dangerouslySetInnerHTML={{ __html: currentData.context }}
          />
        ) : (
          <p className="text-sm text-gray-400 italic">No additional context available</p>
        )}
      </div>
    </div>
  );
}
