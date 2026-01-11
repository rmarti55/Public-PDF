"use client";

import { useEffect } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PDFViewerProps {
  url: string;
  title: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export default function PDFViewer({
  url,
  currentPage,
  onPageChange,
}: PDFViewerProps) {
  // Create the default layout plugin instance with search enabled
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Keep only the thumbnails and search tabs
      defaultTabs[0], // Thumbnails
      defaultTabs[1], // Bookmarks  
      defaultTabs[2], // Attachments
    ],
    toolbarPlugin: {
      searchPlugin: {
        keyword: "",
      },
    },
  });

  // Handle page changes from parent
  useEffect(() => {
    if (currentPage !== undefined && currentPage > 0) {
      defaultLayoutPluginInstance.toolbarPluginInstance.pageNavigationPluginInstance.jumpToPage(
        currentPage - 1
      );
    }
  }, [currentPage, defaultLayoutPluginInstance]);

  return (
    <div className="h-full w-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={1}
          onPageChange={(e) => {
            onPageChange?.(e.currentPage + 1);
          }}
        />
      </Worker>
    </div>
  );
}
