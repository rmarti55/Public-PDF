import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import PDFViewerWrapper from "@/components/PDFViewerWrapper";
import ContextSidebar from "@/components/ContextSidebar";
import ChatPanel from "@/components/ChatPanel";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

async function getDocument(id: string) {
  const document = await prisma.document.findUnique({
    where: { id, published: true },
  });
  return document;
}

export async function generateMetadata({ params }: DocumentPageProps) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    return { title: "Document Not Found" };
  }

  return {
    title: `${document.title} | City Documents Portal`,
    description: document.description || `View ${document.title}`,
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const document = await getDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Documents
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Context */}
        <aside className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden hidden lg:block">
          <ContextSidebar
            documentId={document.id}
            title={document.title}
            description={document.description}
            category={document.category}
            context={document.context}
            createdAt={document.createdAt.toISOString()}
            editable={true}
          />
        </aside>

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Title */}
          <div className="lg:hidden p-4 bg-white border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">{document.title}</h1>
            {document.category && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {document.category}
              </span>
            )}
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <PDFViewerWrapper url={document.filePath} title={document.title} />
          </div>
        </div>

        {/* Right Sidebar - Chat */}
        <aside className="w-96 h-full flex-shrink-0 border-l border-gray-200 bg-white overflow-hidden hidden xl:block">
          <ChatPanel documentId={document.id} documentTitle={document.title} />
        </aside>
      </main>

      {/* Mobile Chat Toggle */}
      <MobileChatToggle documentId={document.id} documentTitle={document.title} />
    </div>
  );
}

// Client component for mobile chat
function MobileChatToggle({
  documentId,
  documentTitle,
}: {
  documentId: string;
  documentTitle: string;
}) {
  return (
    <div className="xl:hidden fixed bottom-4 right-4 z-50">
      <MobileChatButton documentId={documentId} documentTitle={documentTitle} />
    </div>
  );
}

// We need to make the mobile chat button a client component
import MobileChatButton from "@/components/MobileChatButton";
