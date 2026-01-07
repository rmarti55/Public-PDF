"use client";

let pdfjs: typeof import("react-pdf").pdfjs | null = null;

async function getPdfjs() {
  if (typeof window === "undefined") {
    throw new Error("PDF thumbnail generation is only available in the browser");
  }
  
  if (!pdfjs) {
    const reactPdf = await import("react-pdf");
    pdfjs = reactPdf.pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }
  
  return pdfjs;
}

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 520;

/**
 * Generate a thumbnail image from the first page of a PDF file
 * @param file - The PDF file to generate a thumbnail from
 * @returns A Blob containing the PNG thumbnail image
 */
export async function generateThumbnailFromPDF(file: File): Promise<Blob> {
  const pdfLib = await getPdfjs();
  
  // Load the PDF document
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;

  // Get the first page
  const page = await pdf.getPage(1);

  // Calculate scale to fit within thumbnail dimensions while maintaining aspect ratio
  const viewport = page.getViewport({ scale: 1 });
  const scaleX = THUMBNAIL_WIDTH / viewport.width;
  const scaleY = THUMBNAIL_HEIGHT / viewport.height;
  const scale = Math.min(scaleX, scaleY);

  const scaledViewport = page.getViewport({ scale });

  // Create a canvas to render the page
  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Fill with white background
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Render the PDF page to the canvas
  await page.render({
    canvasContext: context,
    viewport: scaledViewport,
    canvas: canvas,
  }).promise;

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create thumbnail blob"));
        }
      },
      "image/png",
      0.9
    );
  });
}

/**
 * Generate a thumbnail from a PDF URL (for existing documents)
 * @param pdfUrl - The URL of the PDF file
 * @returns A Blob containing the PNG thumbnail image
 */
export async function generateThumbnailFromURL(pdfUrl: string): Promise<Blob> {
  const pdfLib = await getPdfjs();
  
  // Fetch the PDF file
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdf = await pdfLib.getDocument({ data: arrayBuffer }).promise;

  // Get the first page
  const page = await pdf.getPage(1);

  // Calculate scale to fit within thumbnail dimensions while maintaining aspect ratio
  const viewport = page.getViewport({ scale: 1 });
  const scaleX = THUMBNAIL_WIDTH / viewport.width;
  const scaleY = THUMBNAIL_HEIGHT / viewport.height;
  const scale = Math.min(scaleX, scaleY);

  const scaledViewport = page.getViewport({ scale });

  // Create a canvas to render the page
  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to get canvas 2D context");
  }

  // Fill with white background
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Render the PDF page to the canvas
  await page.render({
    canvasContext: context,
    viewport: scaledViewport,
    canvas: canvas,
  }).promise;

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create thumbnail blob"));
        }
      },
      "image/png",
      0.9
    );
  });
}
