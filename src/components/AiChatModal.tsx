import { Send, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { generateSystemPrompt } from "../aiPrompt";
import { BotMoodIcon } from "./BotMoodIcon";
import { tools } from "../data/catalog";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiChatModalProps = {
  initialQuestion: string;
  onClose: () => void;
};

const API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AiChatModal({ initialQuestion, onClose }: AiChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialQuestion.trim());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const systemPrompt = useMemo(() => generateSystemPrompt(tools), []);
  const configuredApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY?.trim();
  const apiKey = configuredApiKey && configuredApiKey !== "你的key" ? configuredApiKey : "";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, error]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || isLoading) return;

    if (!apiKey) {
      setError("请先配置 DeepSeek API Key");
      return;
    }

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: question };
    const assistantId = makeId();
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { id: assistantId, role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            ...nextMessages.map((message): DeepSeekMessage => ({
              role: message.role,
              content: message.content,
            })),
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`DeepSeek request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const chunk = parsed.choices?.[0]?.delta?.content ?? "";
          if (!chunk) continue;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + chunk } : message,
            ),
          );
        }
      }
    } catch (requestError) {
      const aborted = requestError instanceof DOMException && requestError.name === "AbortError";
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId && !message.content
            ? { ...message, content: aborted ? "请求超时，请稍后重试。" : "请求失败，请稍后重试。" }
            : message,
        ),
      );
      setError(aborted ? "请求超时，请稍后重试" : "请求失败，请稍后重试");
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="ai-modal-backdrop" role="presentation" onMouseDown={close}>
      <section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="ai-modal-header">
          <h2 id="ai-modal-title">
            <BotMoodIcon />
            问问 AI
          </h2>
          <button type="button" aria-label="关闭 AI 对话" onClick={close}>
            <X size={22} strokeWidth={3} />
          </button>
        </header>

        <div className="ai-message-list" ref={listRef}>
          {messages.length === 0 && (
            <div className="ai-empty">
              <strong>说出你要做什么。</strong>
              <span>我会从 383 个工具里帮你挑。</span>
            </div>
          )}
          {messages.map((message) => (
            <article className={`ai-message ${message.role}`} key={message.id}>
              <div className="ai-message-bubble">
                {message.content ? (
                  message.role === "assistant" ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )
                ) : message.role === "assistant" && isLoading ? (
                  <span className="ai-thinking">思考中...</span>
                ) : null}
              </div>
            </article>
          ))}
          {error && <div className="ai-error">{error}</div>}
        </div>

        <form className="ai-input-row" onSubmit={sendMessage}>
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && draft.trim()) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="问问要用什么工具，比如：我想做一个产品介绍 PPT"
            rows={2}
          />
          <button type="submit" disabled={isLoading || !draft.trim()}>
            <Send size={18} strokeWidth={3} />
            发送
          </button>
        </form>
      </section>
    </div>
  );
}
