"use client";

import { cn } from "@/lib/utils";
import { Message, useChat } from "ai/react";
import { Bot, SendHorizonal, Trash } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

export default function AIChatBox() {
  const {
    messages,
    error,
    isLoading,
    input,
    handleSubmit,
    handleInputChange,
    setMessages,
  } = useChat({
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content:
          "Hello! I'm Kofi, your shopping assistant. " +
          "Whether you're looking for specific products, exploring categories like desserts, breakfast, household essentials, snacks, and more, " +
          "or need help with your shopping experience, " +
          "I'm here to assist you. How can I help you today? ",
      },
    ],
  });

  const lastMessageIsUser = messages[messages.length - 1]?.role === "user";

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-screen flex flex-col">
      <div className="overflow-y-auto px-3 h-full" ref={scrollRef}>
        {messages.map((message) => (
          <ChatMessage message={message} key={message.id} />
        ))}

        {isLoading && lastMessageIsUser && (
          <ChatMessage
            message={{
              id: "loading",
              role: "assistant",
              content: "Thinking...",
            }}
          />
        )}

        {error && (
          <ChatMessage
            message={{
              id: "error",
              role: "assistant",
              content:
                "Oops! Something went wrong. Please check your internet connection and try again.",
            }}
          />
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex m-3 gap-1">
        <button
          className="flex flex-none justify-center items-center"
          title="clear chat"
          type="button"
          onClick={() =>
            setMessages([
              {
                id: "1",
                role: "assistant",
                content:
                  "Hello, I'm Kofi Anaan, your virtual shopping assistant. How can I assist you today?",
              },
            ])
          }
        >
          <Trash size={24} />
        </button>
        <input
          value={input}
          onChange={handleInputChange}
          className="grow border bg-background py-2 px-3 rounded border-black"
          placeholder="Feel free to ask me anything—I’m here to help!"
        />
        <button
          className="flex flex-none justify-center items-center disabled:opacity-50"
          type="submit"
          title="send message"
          disabled={isLoading || input.length === 0}
        >
          <SendHorizonal size={24} />
        </button>
      </form>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message: { role, content } }: ChatMessageProps) {
  const isAIMessage = role === "assistant";

  return (
    <div
      className={cn(
        "flex items-center mt-3",
        isAIMessage ? "justify-start" : "justify-end"
      )}
    >
      {isAIMessage && <Bot className="mr-2 flex-none" />}
      <div
        className={cn(
          "border rounded-md px-3 py-3 max-w-md",
          isAIMessage ? "bg-background" : "bg-foreground text-background"
        )}
      >
        <ReactMarkdown
          components={{
            a: ({ node, ref, ...props }) => (
              <Link
                {...props}
                href={props.href ?? ""}
                className="text-primary hover:underline"
              />
            ),
            p: ({ node, ...props }) => (
              <p {...props} className="mt-3 first:mt-0" />
            ),
            ul: ({ node, ...props }) => (
              <ul
                {...props}
                className="mt-3 list-inside list-disc first:mt-0"
              />
            ),
            li: ({ node, ...props }) => (
              <li {...props} className="mt-1 first:mt-1" />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
