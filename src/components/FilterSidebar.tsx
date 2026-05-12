import {
  Archive,
  Bot,
  BookOpen,
  Briefcase,
  Code2,
  Gamepad2,
  Globe2,
  MoreHorizontal,
  Palette,
  PenLine,
  Sparkles,
  Tags,
  Volume2,
} from "lucide-react";
import type { Category } from "../types";

const icons = {
  archive: Archive,
  bot: Bot,
  book: BookOpen,
  briefcase: Briefcase,
  code: Code2,
  gamepad: Gamepad2,
  globe: Globe2,
  more: MoreHorizontal,
  palette: Palette,
  pen: PenLine,
  sparkles: Sparkles,
  tag: Tags,
  volume: Volume2,
};

function CategoryIcon({ icon }: { icon: string }) {
  const Icon = icons[icon as keyof typeof icons] ?? Tags;
  return <Icon size={19} strokeWidth={2.8} aria-hidden="true" />;
}

type FilterSidebarProps = {
  categories: Category[];
  selectedCategory: string;
  selectedSubcategory: string | null;
  total: number;
  onSelect: (category: string, subcategory?: string | null) => void;
};

export function FilterSidebar({ categories, selectedCategory, selectedSubcategory, total, onSelect }: FilterSidebarProps) {
  return (
    <aside className="browse-sidebar">
      <div className="browse-kicker">
        分类 <small>按类型浏览</small>
      </div>
      <button
        className={`browse-nav-button ${selectedCategory === "全部" ? "cat-active" : ""}`}
        type="button"
        onClick={() => onSelect("全部", null)}
      >
        <span>全部</span>
        <small>({total})</small>
      </button>
      <div className="category-stack">
        {categories.map((category) => {
          const isActive = selectedCategory === category.name && !selectedSubcategory;
          const isOpen = selectedCategory === category.name;
          return (
            <div className="category-block" key={category.id}>
              <button
                className={`browse-nav-button category-button ${isActive ? "cat-active" : ""}`}
                type="button"
                onClick={() => onSelect(category.name, null)}
              >
                <span className="category-title">
                  <CategoryIcon icon={category.icon} />
                  <span>{category.name}</span>
                </span>
                <small>({category.count})</small>
              </button>
              {isOpen && category.children && category.children.length > 0 && (
                <div className="subcategory-stack">
                  {category.children.map((child) => (
                    <button
                      className={`subcat-button ${selectedSubcategory === child.name ? "cat-active" : ""}`}
                      key={child.id}
                      type="button"
                      onClick={() => onSelect(category.name, child.name)}
                    >
                      <span>{child.name}</span>
                      <small>({child.count})</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="filter-papers" aria-label="筛选标签">
        <span>GITHUB</span>
        <span>类型</span>
        <span>语言</span>
      </div>
    </aside>
  );
}
