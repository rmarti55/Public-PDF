import Link from "next/link";
import Image from "next/image";

interface DocumentCardProps {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  thumbnailUrl?: string | null;
}

export default function DocumentCard({
  id,
  title,
  description,
  category,
  createdAt,
  thumbnailUrl,
}: DocumentCardProps) {
  return (
    <Link href={`/documents/${id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all duration-200 h-full flex flex-col overflow-hidden">
        {/* Thumbnail or Fallback Icon */}
        <div className="relative w-full h-48 bg-gray-50 flex items-center justify-center">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={`Thumbnail for ${title}`}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
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
          )}
          {category && (
            <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-600 text-xs font-medium rounded-full shadow-sm">
              {category}
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>
          {description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
              {description}
            </p>
          )}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-blue-600 text-sm font-medium flex items-center">
              View Document
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
