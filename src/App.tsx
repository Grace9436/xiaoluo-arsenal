import { useEffect, useMemo, useState } from "react";
import { categories, quickLinks, siteStats, tools } from "./data/catalog";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { IntroSplash } from "./components/IntroSplash";
import { FilterSidebar } from "./components/FilterSidebar";
import { ToolsGrid } from "./components/ToolsGrid";
import { FriendsWall } from "./components/FriendsWall";
import { AiChatModal } from "./components/AiChatModal";

const SESSION_KEY = "xiaoluo-arsenal-intro-seen";
const FOOTPRINTS_KEY = "footprints_data";

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getTodayParts() {
  const today = new Date();
  const year = today.getFullYear();
  const month = padDatePart(today.getMonth() + 1);
  const day = padDatePart(today.getDate());
  return {
    display: `${year}.${month}.${day}`,
    data: `${year}-${month}-${day}`,
  };
}

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [altTheme, setAltTheme] = useState(false);
  const [footprintCount, setFootprintCount] = useState(() => readFootprintCount());
  const [aiOpen, setAiOpen] = useState(false);
  const todayParts = useMemo(() => getTodayParts(), []);
  const dynamicStats = useMemo(
    () => ({
      ...siteStats,
      date: todayParts.display,
      todayAdded: tools.filter((tool) => tool.addedDate === todayParts.data).length,
      friendVisits: footprintCount,
    }),
    [footprintCount, todayParts],
  );

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);
    const syncFootprints = () => setFootprintCount(readFootprintCount());
    window.addEventListener("popstate", syncPath);
    window.addEventListener("storage", syncFootprints);
    window.addEventListener("footprints:changed", syncFootprints);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener("storage", syncFootprints);
      window.removeEventListener("footprints:changed", syncFootprints);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filteredTools = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === "全部" ||
        (tool.category === selectedCategory &&
          (!selectedSubcategory || tool.subcategory === selectedSubcategory));

      if (!matchesCategory) return false;
      if (!keyword) return true;

      return [
        tool.title,
        tool.description,
        tool.domain,
        tool.category,
        tool.subcategory ?? "",
        tool.note ?? "",
        ...tool.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [query, selectedCategory, selectedSubcategory]);

  const finishIntro = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setIntroDone(true);
  };

  const selectCategory = (category: string, subcategory: string | null = null) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (path === "/friends") {
    return <FriendsWall />;
  }

  return (
    <div className={altTheme ? "app alt-theme" : "app"}>
      {!introDone && <IntroSplash onComplete={finishIntro} />}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
      <Header
        language={language}
        onLanguageChange={setLanguage}
        stats={dynamicStats}
        onThemeToggle={() => setAltTheme((value) => !value)}
      />
      <main>
        <Hero
          language={language}
          query={query}
          quickLinks={quickLinks}
          onQueryChange={setQuery}
          onQuickLink={(value) => {
            setQuery(value);
            selectCategory("全部");
          }}
          onAskAi={() => setAiOpen(true)}
        />
        <section className="browse-section" aria-label="工具浏览区">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            total={siteStats.toolCount}
            onSelect={selectCategory}
          />
          <ToolsGrid
            tools={filteredTools}
            query={query}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            onQueryChange={setQuery}
          />
        </section>
      </main>
      <Footer />
      {aiOpen && <AiChatModal initialQuestion={query} onClose={() => setAiOpen(false)} />}
      <button
        className="scroll-top-btn"
        type="button"
        aria-label="回到顶部"
        title="回到顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}

function readFootprintCount() {
  try {
    const raw = localStorage.getItem(FOOTPRINTS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
