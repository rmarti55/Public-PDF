"use client";

import { useState } from "react";
import PDFViewerWrapper from "./PDFViewerWrapper";
import ChatPanel from "./ChatPanel";

interface DocumentContentProps {
  documentId: string;
  documentTitle: string;
  filePath: string;
  category: string | null;
}

export default function DocumentContent({
  documentId,
  documentTitle,
  filePath,
  category,
}: DocumentContentProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const handleGoToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Title */}
        <div className="lg:hidden p-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">{documentTitle}</h1>
          {category && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              {category}
            </span>
          )}
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          <PDFViewerWrapper
            url={filePath}
            title={documentTitle}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Right Sidebar - Chat */}
      <aside className="w-96 h-[calc(100vh-4rem)] flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden hidden xl:block">
        <ChatPanel
          documentId={documentId}
          documentTitle={documentTitle}
          onGoToPage={handleGoToPage}
        />
      </aside>
    </>
  );
}
