# City Documents Portal

A public document portal with AI-powered analysis for city/government documents. Upload PDFs, provide context, and let visitors ask questions about the documents using an AI assistant.

## Features

- **Public Document Viewer**: Browse and view published PDF documents
- **AI Chat Assistant**: Ask questions about any document using AI
- **Admin CMS**: Password-protected admin panel for document management
- **PDF Text Extraction**: Automatic text extraction from uploaded PDFs
- **Context Editor**: Add background information and context to documents
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **PDF Viewer**: react-pdf
- **PDF Parsing**: pdf-parse
- **LLM Integration**: Vercel AI SDK (supports OpenAI, Anthropic, Google)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd public-pdf-llm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"

   # Admin password
   ADMIN_PASSWORD="your-secure-password"

   # LLM Configuration (choose one provider)
   LLM_PROVIDER="openai"  # Options: openai, anthropic, google
   
   # API Keys (only need one based on your provider)
   OPENAI_API_KEY="sk-..."
   # ANTHROPIC_API_KEY="..."
   # GOOGLE_API_KEY="..."
   ```

4. Set up the database:
   ```bash
   npx prisma migrate deploy
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Admin Access

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) using the password set in `ADMIN_PASSWORD`.

## Project Structure

```
/src
  /app
    /page.tsx                    # Home - document listing
    /documents/[id]/page.tsx     # Document viewer with AI chat
    /admin
      /page.tsx                  # Admin dashboard
      /documents/new/page.tsx    # Upload new document
      /documents/[id]/page.tsx   # Edit document
    /api
      /documents/route.ts        # CRUD for documents
      /documents/[id]/route.ts   # Single document operations
      /chat/route.ts             # LLM chat endpoint
      /auth/route.ts             # Admin login
  /components
    /PDFViewer.tsx               # PDF rendering component
    /ChatPanel.tsx               # AI chat interface
    /DocumentCard.tsx            # Document preview card
    /ContextSidebar.tsx          # Document context display
    /AdminLayout.tsx             # Admin wrapper with auth
    /MobileChatButton.tsx        # Mobile chat toggle
  /lib
    /db.ts                       # Prisma client
    /llm.ts                      # LLM provider abstraction
    /pdf.ts                      # PDF text extraction
/prisma
  /schema.prisma                 # Database schema
/public
  /uploads                       # PDF storage
```

## LLM Configuration

The application supports multiple LLM providers through the Vercel AI SDK:

### OpenAI (default)
```env
LLM_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
LLM_MODEL="gpt-4o"  # Optional, defaults to gpt-4o
```

### Anthropic
```env
LLM_PROVIDER="anthropic"
ANTHROPIC_API_KEY="..."
LLM_MODEL="claude-sonnet-4-20250514"  # Optional
```

### Google
```env
LLM_PROVIDER="google"
GOOGLE_API_KEY="..."
LLM_MODEL="gemini-1.5-pro"  # Optional
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Reset database
npx prisma migrate reset
```

## License

MIT
