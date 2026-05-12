import { Settings } from "lucide-react";
import type { SiteStats } from "../types";

type HeaderProps = {
  language: "zh" | "en";
  stats: SiteStats;
  onLanguageChange: (language: "zh" | "en") => void;
  onThemeToggle: () => void;
};

export function Header({ language, stats, onLanguageChange, onThemeToggle }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="header-inner">
        <button className="brand-lockup" type="button" onClick={() => window.scrollTo({ top: 0 })}>
          小落私藏弹药库
        </button>
        <a className="friend-chip" href="/friends">
          <span aria-hidden="true">👣</span>
          <strong>{stats.friendVisits}</strong>
          <span>朋友来过</span>
        </a>
        <div className="header-spacer" />
        <div className="site-meta" aria-label="站点统计">
          <span>{stats.date}</span>
          <span className="dot">·</span>
          <span>
            <strong>{stats.toolCount}</strong> 工具
          </span>
          <span className="dot">·</span>
          <span className="today-badge">今日新增 {stats.todayAdded}</span>
        </div>
        <div className="language-switch" aria-label="语言切换">
          <button
            type="button"
            aria-pressed={language === "zh"}
            className={language === "zh" ? "active" : ""}
            onClick={() => onLanguageChange("zh")}
          >
            中
          </button>
          <span>/</span>
          <button
            type="button"
            aria-pressed={language === "en"}
            className={language === "en" ? "active" : ""}
            onClick={() => onLanguageChange("en")}
          >
            EN
          </button>
        </div>
        <button className="settings-btn" type="button" aria-label="切换主题" title="切换主题" onClick={onThemeToggle}>
          <Settings size={20} strokeWidth={2.8} />
        </button>
      </div>
    </header>
  );
}
