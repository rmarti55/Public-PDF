"use client";

import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading PDF viewer...</p>
      </div>
    </div>
  ),
});

interface PDFViewerWrapperProps {
  url: string;
  title: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export default function PDFViewerWrapper({
  url,
  title,
  currentPage,
  onPageChange,
}: PDFViewerWrapperProps) {
  return (
    <PDFViewer
      url={url}
      title={title}
      currentPage={currentPage}
      onPageChange={onPageChange}
    />
  );
}
