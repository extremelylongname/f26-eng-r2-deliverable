"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TypographyH2, TypographyP } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import ReactMarkdown from "react-markdown";
import { z } from "zod";

// Matches the 1-2000 character limit enforced by /api/chat
const MAX_MESSAGE_LENGTH = 2000;

// Shape of the JSON the /api/chat route answers with
const chatResponseSchema = z.union([z.object({ response: z.string() }), z.object({ error: z.string() })]);

interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

// The user's own messages are shown exactly as typed; bot replies are Markdown, styled by the .markdown rules in
// globals.css because Tailwind's preflight strips list markers and heading sizes
function ChatBubble({ role, content, className }: ChatMessage & { className?: string }) {
  return (
    <div className={cn("flex", role === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] break-words rounded-2xl p-3 text-sm",
          role === "user"
            ? "whitespace-pre-wrap rounded-br-none bg-primary text-primary-foreground"
            : "markdown rounded-bl-none border border-border bg-background text-foreground",
          className,
        )}
      >
        {role === "user" ? content : <ReactMarkdown>{content}</ReactMarkdown>}
      </div>
    </div>
  );
}

export default function SpeciesChatbot() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Keep the newest message (or the "Thinking..." bubble) in view
  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight, behavior: "smooth" });
  }, [chatLog, isLoading]);

  const appendMessage = (entry: ChatMessage) => setChatLog((log) => [...log, entry]);

  const handleSubmit = async () => {
    const content = message.trim();
    if (!content || isLoading) return;

    setIsLoading(true);
    appendMessage({ role: "user", content });
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      // A body that is not JSON (e.g. an HTML error page) means the server answered but failed, not that the
      // connection dropped, so it falls through to the generic message below rather than the catch
      const parsed = chatResponseSchema.safeParse(await res.json().catch(() => null));
      if (res.ok && parsed.success && "response" in parsed.data) {
        appendMessage({ role: "bot", content: parsed.data.response });
      } else {
        appendMessage({
          role: "bot",
          content:
            parsed.success && "error" in parsed.data ? parsed.data.error : "Something went wrong. Please try again.",
        });
      }
    } catch {
      appendMessage({ role: "bot", content: "Could not reach the chatbot. Check your connection and try again." });
    } finally {
      // Render the re-enabled textarea synchronously so it can take focus again
      flushSync(() => setIsLoading(false));
      textareaRef.current?.focus();
    }
  };

  // Enter sends, Shift+Enter inserts a newline; Enter during IME composition is left alone
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <>
      <TypographyH2>Species Chatbot</TypographyH2>
      <div className="mt-4 rounded-lg bg-foreground p-4 text-background">
        <TypographyP>
          The Species Chatbot answers questions about animals, plants and other living things: their habitat, diet,
          speed, size, lifespan, conservation status and more. Questions about anything else are politely declined.
        </TypographyP>
        <TypographyP>
          Type your question below and press Enter or click Send. Answers come from an AI model, so double-check
          anything important.
        </TypographyP>
      </div>
      <div className="mx-auto mt-6">
        {/* Chat history */}
        <div
          ref={chatLogRef}
          aria-live="polite"
          className="h-[400px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-4"
        >
          {chatLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start chatting about a species!</p>
          ) : (
            chatLog.map((msg, index) => <ChatBubble key={index} role={msg.role} content={msg.content} />)
          )}
          {isLoading && <ChatBubble role="bot" content="Thinking..." className="italic text-muted-foreground" />}
        </div>
        {/* Textarea and submission */}
        <div className="mt-4 flex flex-col items-end">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label="Ask about a species"
            placeholder="Ask about a species..."
            className="min-h-0 resize-none overflow-hidden"
          />
          <div className="mt-2 flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Enter to send, Shift+Enter for a new line. {message.length} / {MAX_MESSAGE_LENGTH}
            </span>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isLoading}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
