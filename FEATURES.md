# Feature Registry

> **Purpose**: This document is the authoritative source of truth for all implemented features.  
> **Review this before merging any PR** to ensure no features are accidentally removed.

---

## Quick Reference

| Area | Feature Count | Status |
|------|---------------|--------|
| Public Portal | 6 | 5 Working, 1 Partial |
| Chat System | 10 | All Working |
| Admin System | 11 | All Working |
| Document Context | 3 | All Working |
| LLM Integration | 4 | All Working |

---

## Public Document Portal

### PORTAL-001: Document Grid View
- **Description**: Display documents as thumbnail cards in a responsive grid
- **User Value**: Visual browsing of documents with preview images
- **Files**: 
  - `src/components/DocumentCard.tsx`
  - `src/components/DocumentList.tsx`
- **Status**: ✅ Working

### PORTAL-002: Document Table View
- **Description**: Display documents in a compact table format with thumbnails
- **User Value**: Efficient scanning of many documents at once
- **Files**: 
  - `src/components/DocumentTable.tsx`
  - `src/components/DocumentList.tsx`
- **Status**: ✅ Working

### PORTAL-003: View Mode Toggle
- **Description**: Switch between card and table views
- **User Value**: User preference for document browsing style
- **Files**: 
  - `src/components/DocumentList.tsx` (lines 26-79)
- **Dependencies**: PORTAL-001, PORTAL-002
- **Status**: ✅ Working

### PORTAL-004: Category Filter Pills
- **Description**: Filter documents by category using pill buttons
- **User Value**: Find documents in specific categories quickly
- **Files**: 
  - `src/app/page.tsx` (lines 76-92)
- **Status**: ⚠️ Partial - UI renders but filtering not implemented

### PORTAL-005: PDF Viewer with Search
- **Description**: View PDFs with built-in search, thumbnails, and bookmarks
- **User Value**: Read and navigate documents effectively
- **Files**: 
  - `src/components/PDFViewer.tsx`
  - `src/components/PDFViewerWrapper.tsx`
- **Dependencies**: react-pdf-viewer library
- **Status**: ✅ Working

### PORTAL-006: Programmatic Page Navigation
- **Description**: Navigate PDF to specific page via code (e.g., from chat)
- **User Value**: Jump directly to relevant pages mentioned in chat
- **Files**: 
  - `src/components/PDFViewer.tsx` (lines 38-44)
  - `src/components/DocumentContent.tsx` (handleGoToPage)
- **Dependencies**: PORTAL-005
- **Status**: ✅ Working

---

## Chat System

### CHAT-001: AI Document Chat
- **Description**: Ask questions about the document and get AI responses
- **User Value**: Understand document content through conversation
- **Files**: 
  - `src/components/ChatPanel.tsx`
  - `src/app/api/chat/route.ts`
  - `src/lib/llm.ts` (chat function)
- **Dependencies**: OpenRouter API, Document extractedText
- **Status**: ✅ Working

### CHAT-002: Chat History Persistence
- **Description**: Save and restore chat messages across page reloads
- **User Value**: Continue conversations without losing context
- **Files**: 
  - `src/app/api/chat/route.ts` (lines 28-35, 55-75) - saves messages
  - `src/app/api/documents/[id]/messages/route.ts` - retrieves messages
  - `src/components/ChatPanel.tsx` (lines 408-432) - loads on mount
- **Database**: `ChatMessage` model in `prisma/schema.prisma`
- **Status**: ✅ Working

### CHAT-003: Chat Loading State
- **Description**: Show loading indicator while fetching chat history
- **User Value**: Clear feedback that history is being loaded
- **Files**: 
  - `src/components/ChatPanel.tsx` (ChatPanelLoading component, lines 15-95)
- **Dependencies**: CHAT-002
- **Status**: ✅ Working

### CHAT-004: Suggested Questions
- **Description**: Show starter questions when chat is empty
- **User Value**: Help users get started with relevant questions
- **Files**: 
  - `src/components/ChatPanel.tsx` (lines 188-192, 259-268)
- **Status**: ✅ Working

### CHAT-005: Stop Generation Button
- **Description**: Stop AI response mid-generation
- **User Value**: Cancel unwanted or slow responses
- **Files**: 
  - `src/components/ChatPanel.tsx` (lines 339-352)
- **Status**: ✅ Working

### CHAT-006: Markdown Message Rendering
- **Description**: Render AI responses with markdown formatting
- **User Value**: Readable responses with lists, headers, code blocks
- **Files**: 
  - `src/components/MessageContent.tsx`
- **Dependencies**: react-markdown, remark-gfm
- **Status**: ✅ Working

### CHAT-007: Page Link Buttons
- **Description**: Convert `[page X]` references to clickable buttons
- **User Value**: Jump to referenced pages directly from chat
- **Files**: 
  - `src/components/MessageContent.tsx` (PAGE_LINK_REGEX, lines 32-47)
- **Dependencies**: PORTAL-006, CHAT-006
- **Status**: ✅ Working

### CHAT-008: GoToPage Tool Invocation
- **Description**: AI can call goToPage tool to navigate PDF
- **User Value**: AI proactively shows relevant pages
- **Files**: 
  - `src/lib/llm.ts` (chatTools, lines 34-42)
  - `src/components/ChatPanel.tsx` (lines 171-186, 291-314)
- **Dependencies**: PORTAL-006
- **Status**: ✅ Working

### CHAT-009: Mobile Chat Modal
- **Description**: Floating button opens chat in modal on mobile/tablet
- **User Value**: Access chat on smaller screens
- **Files**: 
  - `src/components/MobileChatButton.tsx`
- **Dependencies**: CHAT-001
- **Status**: ✅ Working

### CHAT-010: Model Attribution & Response Duration
- **Description**: Show which AI model generated each response and how long it took
- **User Value**: Transparency about AI model being used and response time
- **Files**: 
  - `src/lib/config.ts` (LLM_CONFIG with model display name)
  - `src/components/ChatPanel.tsx`:
    - Lines 108-109: State for tracking durations (`messageDurations`, `responseStartTimeRef`)
    - Lines 165-179: Effect to calculate duration when response completes
    - Lines 336-343: Display model name and duration below assistant messages
- **Display Format**: "Claude Sonnet 4.5 · 2.3s"
- **Status**: ✅ Working

---

## Admin System

### ADMIN-001: Document CRUD
- **Description**: Create, read, update, delete documents
- **User Value**: Manage document library
- **Files**: 
  - `src/app/api/documents/route.ts` (GET, POST)
  - `src/app/api/documents/[id]/route.ts` (GET, PUT, DELETE)
  - `src/app/admin/page.tsx`
- **Status**: ✅ Working

### ADMIN-002: Publish/Unpublish Toggle
- **Description**: Toggle document visibility to public
- **User Value**: Control which documents are publicly visible
- **Files**: 
  - `src/app/admin/page.tsx` (togglePublished, lines 49-66)
- **Dependencies**: ADMIN-001
- **Status**: ✅ Working

### ADMIN-003: PDF Upload (Vercel Blob)
- **Description**: Upload PDFs to Vercel Blob storage
- **User Value**: Store documents in cloud storage
- **Files**: 
  - `src/components/DocumentForm.tsx` (uploadFile, lines 77-118)
  - `src/app/api/upload/route.ts`
- **Dependencies**: @vercel/blob
- **Status**: ✅ Working

### ADMIN-004: Server Upload Fallback
- **Description**: Fallback to server-side upload if client upload fails
- **User Value**: Reliable uploads even without Blob token
- **Files**: 
  - `src/app/api/upload-server/route.ts`
  - `src/components/DocumentForm.tsx` (lines 91-117)
- **Dependencies**: ADMIN-003
- **Status**: ✅ Working

### ADMIN-005: AI Title Generation
- **Description**: Generate document title using AI
- **User Value**: Save time writing titles
- **Files**: 
  - `src/components/DocumentForm.tsx` (handleGenerateTitle, lines 121-165)
  - `src/app/api/generate-title/route.ts`
  - `src/app/api/documents/[id]/generate-title/route.ts`
  - `src/lib/llm.ts` (generateTitle)
- **Status**: ✅ Working

### ADMIN-006: AI Description Generation
- **Description**: Generate document description/summary using AI
- **User Value**: Save time writing descriptions
- **Files**: 
  - `src/components/DocumentForm.tsx` (handleGenerateDescription, lines 168-212)
  - `src/app/api/summarize/route.ts`
  - `src/app/api/documents/[id]/generate-description/route.ts`
  - `src/lib/llm.ts` (generateDescription, summarizeDocument)
- **Status**: ✅ Working

### ADMIN-007: AI Full Document Analysis
- **Description**: Generate title, description, category, and key points in one call
- **User Value**: One-click metadata generation for new documents
- **Files**: 
  - `src/components/DocumentForm.tsx` (handleAnalyzeDocument, lines 215-282)
  - `src/app/api/analyze-document/route.ts`
  - `src/lib/llm.ts` (analyzeDocument, documentMetadataSchema)
- **Status**: ✅ Working

### ADMIN-008: Thumbnail Generation
- **Description**: Generate thumbnail from first page of PDF
- **User Value**: Visual preview of documents in listings
- **Files**: 
  - `src/lib/pdf-thumbnail.ts`
  - `src/components/DocumentForm.tsx` (lines 319-338)
- **Status**: ✅ Working

### ADMIN-009: Thumbnail Regeneration
- **Description**: Regenerate thumbnail for existing documents
- **User Value**: Fix missing or broken thumbnails
- **Files**: 
  - `src/app/admin/documents/[id]/page.tsx` (handleRegenerateThumbnail, lines 105-149)
- **Dependencies**: ADMIN-008
- **Status**: ✅ Working

### ADMIN-010: Text Re-extraction
- **Description**: Re-extract text from PDF with updated page markers
- **User Value**: Fix page references after extraction improvements
- **Files**: 
  - `src/app/api/documents/[id]/reextract/route.ts`
  - `src/app/admin/documents/[id]/page.tsx` (handleReextractText, lines 151-172)
  - `src/lib/pdf.ts`
- **Status**: ✅ Working

### ADMIN-011: Inline Metadata Editing
- **Description**: Edit document metadata from the document view page
- **User Value**: Quick edits without going to admin
- **Files**: 
  - `src/components/ContextSidebar.tsx` (editable mode)
- **Status**: ✅ Working

---

## Document Context

### CONTEXT-001: Context Sidebar
- **Description**: Display document metadata in sidebar
- **User Value**: See title, category, description, date at a glance
- **Files**: 
  - `src/components/ContextSidebar.tsx`
  - `src/app/documents/[id]/page.tsx` (lines 73-83)
- **Status**: ✅ Working

### CONTEXT-002: Background/Context Field
- **Description**: Rich HTML field for additional context
- **User Value**: Add background info, links, key points
- **Files**: 
  - `src/components/ContextSidebar.tsx` (lines 191-211)
- **Note**: Uses dangerouslySetInnerHTML - only admin can edit
- **Status**: ✅ Working

### CONTEXT-003: Inline Edit Mode
- **Description**: Toggle edit mode to modify metadata in-place
- **User Value**: Edit without navigating away
- **Files**: 
  - `src/components/ContextSidebar.tsx` (isEditing state, handleSave)
- **Dependencies**: CONTEXT-001
- **Status**: ✅ Working

---

## LLM Integration

### LLM-001: OpenRouter Provider
- **Description**: Connect to OpenRouter API for LLM access
- **User Value**: Access to various AI models
- **Files**: 
  - `src/lib/llm.ts` (openrouter provider, lines 8-12)
- **Config**: OPENROUTER_API_KEY env var
- **Status**: ✅ Working

### LLM-002: Bike/Ped Advocacy Prompt
- **Description**: System prompt framing AI as bike/pedestrian advocate
- **User Value**: Document analysis from urbanist perspective
- **Files**: 
  - `src/lib/llm.ts` (CHAT_SYSTEM_PROMPT, lines 14-31)
- **Status**: ✅ Working

### LLM-003: GoToPage Tool Definition
- **Description**: Tool allowing AI to navigate user to PDF pages
- **User Value**: AI can show relevant content directly
- **Files**: 
  - `src/lib/llm.ts` (chatTools, lines 34-42)
- **Dependencies**: CHAT-008
- **Status**: ✅ Working

### LLM-004: Structured Metadata Extraction
- **Description**: Extract structured data (title, category, impact) from documents
- **User Value**: Consistent metadata with AI assistance
- **Files**: 
  - `src/lib/llm.ts` (documentMetadataSchema, analyzeDocument, lines 99-131)
- **Dependencies**: Zod schema validation
- **Status**: ✅ Working

---

## Database Schema

### Models

```prisma
Document {
  id, title, description, category, fileName, filePath,
  thumbnailUrl, extractedText, context, published,
  createdAt, updatedAt, messages[]
}

ChatMessage {
  id, documentId, document, role, content, createdAt
}

AdminUser {
  id, username, passwordHash, createdAt
}
```

---

## Known Issues / TODO

| ID | Issue | Priority |
|----|-------|----------|
| PORTAL-004 | Category filter pills don't filter | Low |

---

## Changelog

| Date | Change | Features Affected |
|------|--------|-------------------|
| 2026-01-10 | Initial feature registry created | All |
| 2026-01-10 | Implemented model attribution on chat messages | CHAT-010 |
| 2026-01-10 | Added response duration display next to model name | CHAT-010 |

---

## How to Use This Document

### When Adding Features
1. Add a new entry with unique ID (e.g., `CHAT-011`)
2. Fill in all fields: Description, User Value, Files, Dependencies, Status
3. Update the Quick Reference table
4. Add to Changelog

### When Modifying Features
1. Update the relevant entry
2. Add to Changelog with date

### When Removing Features
1. Do NOT just delete the entry
2. Change Status to `❌ Removed` with reason
3. Add to Changelog with justification

### Before Merging PRs
1. Check this document for features in affected files
2. Verify no features were accidentally removed
3. If intentionally removing, update this document
