import Link from "next/link";
import DocumentCard from "@/components/DocumentCard";
import { prisma } from "@/lib/db";

// Force dynamic rendering to always show fresh data from database
export const dynamic = 'force-dynamic';

interface Document {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  createdAt: Date;
}

async function getDocuments(): Promise<Document[]> {
  const documents = await prisma.document.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      createdAt: true,
    },
  });
  return documents;
}

export default async function Home() {
  const documents = await getDocuments();
  const categories = [...new Set(documents.map((d) => d.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Public Documents Portal
              </span>
            </div>
            <Link
              href="/admin"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        {/* Categories Filter */}
        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full">
                All Documents
              </span>
              {categories.map((category) => (
                <span
                  key={category}
                  className="px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-full border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Documents Available
            </h3>
            <p className="text-gray-500">
              Check back later for published documents.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                description={doc.description}
                category={doc.category}
                createdAt={doc.createdAt.toISOString()}
              />
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
