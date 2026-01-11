"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import MessageContent from "./MessageContent";
import { LLM_CONFIG } from "@/lib/config";

interface ChatPanelProps {
  documentId: string;
  documentTitle: string;
  onGoToPage?: (page: number) => void;
}

// Loading component shown while fetching chat history
function ChatPanelLoading() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">
              Ask questions about this document
            </p>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col">
        <div className="mt-auto">
          <div className="flex justify-center py-8">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Disabled input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Loading chat history..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-900 opacity-50"
            disabled
          />
          <button
            disabled
            className="px-4 py-2 bg-blue-600 text-white rounded-full opacity-50 cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Inner component that contains useChat - only renders after messages are loaded
function ChatPanelContent({
  documentId,
  documentTitle,
  onGoToPage,
  initialMessages,
}: ChatPanelProps & { initialMessages: UIMessage[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [inputValue, setInputValue] = useState("");
  
  // Track response duration per message
  const [messageDurations, setMessageDurations] = useState<Record<string, number>>({});
  const responseStartTimeRef = useRef<number | null>(null);

  // useChat now initializes with the already-loaded messages
  const { messages, sendMessage, status, error, stop } = useChat({
    id: documentId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages }) => {
        const lastMessage = messages[messages.length - 1];
        const messageText = lastMessage?.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || "";
        
        return {
          body: {
            documentId,
            message: messageText,
            history: messages.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join(""),
            })),
          },
        };
      },
    }),
    onError: (error) => {
      if (error.message?.includes("API key")) {
        setHasApiKey(false);
      }
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Track response duration
  useEffect(() => {
    if (status === "submitted") {
      // Start timing when request is submitted
      responseStartTimeRef.current = Date.now();
    } else if (status === "ready" && responseStartTimeRef.current !== null) {
      // Calculate duration when response completes
      const duration = (Date.now() - responseStartTimeRef.current) / 1000;
      const lastAssistantMessage = messages.filter(m => m.role === "assistant").pop();
      if (lastAssistantMessage) {
        setMessageDurations(prev => ({
          ...prev,
          [lastAssistantMessage.id]: duration,
        }));
      }
      responseStartTimeRef.current = null;
    }
  }, [status, messages]);

  const handleSubmit = (e?: React.FormEvent, directMessage?: string) => {
    e?.preventDefault();
    const messageToSend = directMessage || inputValue.trim();
    if (!messageToSend || status !== "ready" || !hasApiKey) return;

    sendMessage({ text: messageToSend });
    setInputValue("");
  };

  // Helper to extract text from message parts
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Handle tool invocations (goToPage) from assistant messages
  useEffect(() => {
    if (!onGoToPage) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "assistant") return;
    
    // Check for tool invocations in the message parts
    for (const part of lastMessage.parts) {
      if (isToolUIPart(part) && getToolName(part) === "goToPage") {
        const input = part.input as { pageNumber: number; reason: string } | undefined;
        if (input?.pageNumber) {
          onGoToPage(input.pageNumber);
        }
      }
    }
  }, [messages, onGoToPage]);

  const suggestedQuestions = [
    "What is this document about?",
    "What are the key points?",
    "Summarize the main findings",
  ];

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">
              Ask questions about this document
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col">
        <div className="mt-auto space-y-4">
          {!hasApiKey && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <strong>Note:</strong> LLM API key not configured. Please set up your
              API key in the environment variables to enable chat.
            </div>
          )}

          {messages.length === 0 && hasApiKey && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Ask about &ldquo;{documentTitle}&rdquo;
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                I can help you understand this document. Try asking:
              </p>
              <div className="space-y-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(undefined, question)}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[80%] ${message.role === "user" ? "" : "space-y-1"}`}>
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{getMessageText(message)}</p>
                  ) : (
                    <>
                      <MessageContent content={getMessageText(message)} onGoToPage={onGoToPage} />
                      {/* Render tool invocations */}
                      {message.parts
                        .filter(isToolUIPart)
                        .map((part, idx) => {
                          if (getToolName(part) === "goToPage") {
                            const input = part.input as { pageNumber: number; reason: string } | undefined;
                            if (!input?.pageNumber) return null;
                            return (
                              <button
                                key={idx}
                                onClick={() => onGoToPage?.(input.pageNumber)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Go to page {input.pageNumber}
                                {input.reason && <span className="text-blue-500">— {input.reason}</span>}
                              </button>
                            );
                          }
                          return null;
                        })}
                    </>
                  )}
                </div>
                {/* Model attribution and duration for assistant messages */}
                {message.role === "assistant" && (
                  <p className="text-[10px] text-gray-400 px-2">
                    {LLM_CONFIG.displayName}
                    {messageDurations[message.id] && (
                      <span> · {messageDurations[message.id].toFixed(1)}s</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}

          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {status === "streaming" && (
            <div className="flex justify-center">
              <button
                onClick={() => stop()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop generating
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Error: {error.message}
            </div>
          )}

        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
            disabled={isLoading || !hasApiKey}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !hasApiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// Main component - loads messages first, then renders ChatPanelContent
export default function ChatPanel({
  documentId,
  documentTitle,
  onGoToPage,
}: ChatPanelProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  // Load existing messages BEFORE rendering the chat component
  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch(`/api/documents/${documentId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const loaded: UIMessage[] = data.messages.map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: m.content }],
            createdAt: new Date(),
          }));
          setInitialMessages(loaded);
        } else {
          // If fetch fails, initialize with empty array
          setInitialMessages([]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        // On error, initialize with empty array so chat still works
        setInitialMessages([]);
      }
    }
    loadMessages();
  }, [documentId]);

  // Show loading state until messages are loaded
  if (initialMessages === null) {
    return <ChatPanelLoading />;
  }

  // Once messages are loaded, render the actual chat component
  // useChat will now initialize with the correct messages
  return (
    <ChatPanelContent
      documentId={documentId}
      documentTitle={documentTitle}
      onGoToPage={onGoToPage}
      initialMessages={initialMessages}
    />
  );
}
