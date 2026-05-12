import { Search } from "lucide-react";

type HeroProps = {
  language: "zh" | "en";
  query: string;
  quickLinks: Array<{ label: string; query: string }>;
  onQueryChange: (value: string) => void;
  onQuickLink: (value: string) => void;
  onAskAi: () => void;
};

export function Hero({ language, query, quickLinks, onQueryChange, onQuickLink, onAskAi }: HeroProps) {
  return (
    <section className="hero-imagine">
      <div className="hero-deco sticker-one">TOOLS</div>
      <div className="hero-deco sticker-two">AI</div>
      <div className="hero-deco ring" />
      <div className="hero-content reveal-stagger">
        <div className="kicker-pill">私人收藏 · 动态手帐</div>
        <h1 className="hero-headline" aria-label={language === "zh" ? "你在做什么？" : "What are you making?"}>
          {(language === "zh" ? "你在做什么？" : "What now?").split("").map((char, index) => (
            <span key={`${char}-${index}`} style={{ animationDelay: `${index * 45}ms` }}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>
        <p className="hero-copy">
          {language === "zh"
            ? "我亲手存的那些审美的、在生长的、不喧嚣的 AI 工具，你捞捞看。"
            : "A hand-picked, still-growing wall of useful AI tools with a sharper attitude."}
        </p>
        <div className="ask-card" role="search">
          <Search className="ask-icon" size={22} strokeWidth={3} aria-hidden="true" />
          <textarea
            className="ask-textarea"
            placeholder={language === "zh" ? "搜索工具、标签、网址..." : "Search tools, tags, domains..."}
            rows={1}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) {
                event.preventDefault();
                onAskAi();
              }
            }}
          />
          <button className="ask-button" type="button" onClick={onAskAi}>
            Ask AI
          </button>
        </div>
        <div className="prompt-rail" aria-label="快捷入口">
          {quickLinks.map((link) => (
            <button key={link.label} className="prompt-chip" type="button" onClick={() => onQuickLink(link.query)}>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
