import { Search } from "lucide-react";
import type { Tool } from "../types";
import { ToolCard } from "./ToolCard";

type ToolsGridProps = {
  tools: Tool[];
  query: string;
  selectedCategory: string;
  selectedSubcategory: string | null;
  onQueryChange: (value: string) => void;
};

export function ToolsGrid({ tools, query, selectedCategory, selectedSubcategory, onQueryChange }: ToolsGridProps) {
  const title = selectedCategory === "全部" ? "全部工具" : selectedSubcategory ?? selectedCategory;
  const path = selectedCategory === "全部" ? "全部" : ["全部", selectedCategory, selectedSubcategory].filter(Boolean).join(" / ");

  return (
    <section className="tools-panel" id="tools">
      <div className="tools-header">
        <div>
          <div className="tools-title-row">
            <h2>{title}</h2>
            <span className="count-badge">{tools.length}</span>
          </div>
          <p className="filter-path">{path}</p>
        </div>
        <label className="panel-search">
          <Search size={18} strokeWidth={3} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="在当前工具里找..."
          />
        </label>
      </div>
      {tools.length > 0 ? (
        <div className="tools-grid">
          {tools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>没有找到匹配工具</strong>
          <span>换个关键词，或者点左侧分类重新开始。</span>
        </div>
      )}
    </section>
  );
}
