"use client";

import { useState } from "react";
import DocumentCard from "./DocumentCard";
import DocumentTable from "./DocumentTable";

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
}

interface DocumentListProps {
  documents: Document[];
}

type ViewMode = "cards" | "table";

export default function DocumentList({ documents }: DocumentListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-end mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode("cards")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "cards"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            aria-label="Card view"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            aria-label="Table view"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Document Views */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              description={doc.description}
              category={doc.category}
              thumbnailUrl={doc.thumbnailUrl}
              createdAt={doc.createdAt}
            />
          ))}
        </div>
      ) : (
        <DocumentTable documents={documents} />
      )}
    </div>
  );
}
