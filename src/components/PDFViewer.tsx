"use client";

import { useEffect, useRef } from "react";
import { Worker, Viewer, ScrollMode } from "@react-pdf-viewer/core";
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
  // Track the last page we scrolled to avoid feedback loops
  const lastScrolledPage = useRef<number | null>(null);
  
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

  // Handle programmatic page navigation (e.g., from chat panel)
  // Only jump if this is a NEW page request, not from user scrolling
  useEffect(() => {
    if (currentPage !== undefined && currentPage > 0) {
      // Only jump if this page is different from what we last reported via onPageChange
      if (lastScrolledPage.current !== currentPage) {
        defaultLayoutPluginInstance.toolbarPluginInstance.pageNavigationPluginInstance.jumpToPage(
          currentPage - 1
        );
      }
    }
  }, [currentPage, defaultLayoutPluginInstance]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={1}
          scrollMode={ScrollMode.Vertical}
          enableSmoothScroll={false}
          theme={{
            theme: 'light',
          }}
          onPageChange={(e) => {
            const newPage = e.currentPage + 1;
            // Track that this page change came from user scrolling
            lastScrolledPage.current = newPage;
            onPageChange?.(newPage);
          }}
        />
      </Worker>
    </div>
  );
}
