import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type StatusFilter = "all" | "visible" | "hidden";
type RowAction = "delete" | "toggle" | "sort";

export type AdminToolRow = {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  domain: string | null;
  cover_url: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | string | null;
  note: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  added_date: string | null;
  created_at: string | null;
};

type AdminToolsListProps = {
  refreshKey?: number;
  onEdit?: (tool: AdminToolRow) => void;
};

function normalizeTags(tags: AdminToolRow["tags"]): string[] {
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function getDomain(tool: AdminToolRow): string {
  if (tool.domain) {
    return tool.domain;
  }

  if (!tool.url) {
    return "";
  }

  try {
    return new URL(tool.url).hostname;
  } catch {
    return tool.url;
  }
}

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : "-";
}

function getLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminToolsList({ refreshKey = 0, onEdit }: AdminToolsListProps) {
  const [tools, setTools] = useState<AdminToolRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [busyRow, setBusyRow] = useState<{ id: string; action: RowAction } | null>(null);
  const [sortDrafts, setSortDrafts] = useState<Record<string, number>>({});

  const loadTools = useCallback(async () => {
    if (!supabase) {
      setLoadError("Supabase 未配置");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("tools")
      .select("id,title,description,url,domain,cover_url,category,subcategory,tags,note,sort_order,is_visible,added_date,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message || "读取工具列表失败");
      setTools([]);
      setIsLoading(false);
      return;
    }

    setTools((data ?? []) as AdminToolRow[]);
    setSortDrafts({});
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadTools();
  }, [loadTools, refreshKey]);

  const categories = useMemo(() => {
    return Array.from(new Set(tools.map((tool) => tool.category).filter(Boolean) as string[]));
  }, [tools]);

  const stats = useMemo(() => {
    const today = getLocalDateString();
    const visibleCount = tools.filter((tool) => tool.is_visible === true).length;
    const hiddenCount = tools.length - visibleCount;
    const todayAdded = tools.filter((tool) => formatDate(tool.added_date) === today).length;

    return {
      total: tools.length,
      visibleCount,
      hiddenCount,
      todayAdded,
      categoryCount: categories.length,
    };
  }, [categories.length, tools]);

  const filteredTools = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const title = tool.title ?? "";
      const matchesTitle = !keyword || title.toLowerCase().includes(keyword);
      const matchesCategory = category === "all" || tool.category === category;
      const matchesStatus =
        status === "all" ||
        (status === "visible" && tool.is_visible === true) ||
        (status === "hidden" && tool.is_visible !== true);

      return matchesTitle && matchesCategory && matchesStatus;
    });
  }, [category, query, status, tools]);

  const deleteTool = async (tool: AdminToolRow) => {
    if (!supabase || busyRow) {
      return;
    }

    const confirmed = window.confirm("确定删除这个工具吗？此操作不可恢复。");

    if (!confirmed) {
      return;
    }

    setActionError("");
    setBusyRow({ id: tool.id, action: "delete" });

    const { error } = await supabase.from("tools").delete().eq("id", tool.id);

    if (error) {
      setActionError(error.message || "删除失败");
      setBusyRow(null);
      return;
    }

    setBusyRow(null);
    await loadTools();
  };

  const toggleVisible = async (tool: AdminToolRow) => {
    if (!supabase || busyRow) {
      return;
    }

    const nextValue = tool.is_visible !== true;
    const previousTools = tools;

    setActionError("");
    setBusyRow({ id: tool.id, action: "toggle" });
    setTools((current) =>
      current.map((item) => (item.id === tool.id ? { ...item, is_visible: nextValue } : item)),
    );

    const { error } = await supabase.from("tools").update({ is_visible: nextValue }).eq("id", tool.id);

    if (error) {
      setTools(previousTools);
      setActionError(error.message || "更新显示状态失败");
      setBusyRow(null);
      return;
    }

    setBusyRow(null);
  };

  const saveSortOrder = async (tool: AdminToolRow) => {
    if (!supabase || busyRow) {
      return;
    }

    const nextValue = sortDrafts[tool.id] ?? tool.sort_order ?? 0;

    setActionError("");
    setBusyRow({ id: tool.id, action: "sort" });

    const { error } = await supabase.from("tools").update({ sort_order: nextValue }).eq("id", tool.id);

    if (error) {
      setActionError(error.message || "保存排序失败");
      setBusyRow(null);
      return;
    }

    setBusyRow(null);
    await loadTools();
  };

  if (isLoading) {
    return <div className="admin-table-state">loading...</div>;
  }

  if (loadError) {
    return <div className="admin-table-state admin-table-error">读取失败：{loadError}</div>;
  }

  return (
    <section className="admin-tools-panel" aria-labelledby="admin-tools-title">
      <div className="admin-stats-grid" aria-label="后台统计">
        <article>
          <span>工具总数</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>显示中</span>
          <strong>{stats.visibleCount}</strong>
        </article>
        <article>
          <span>已隐藏</span>
          <strong>{stats.hiddenCount}</strong>
        </article>
        <article>
          <span>今日新增</span>
          <strong>{stats.todayAdded}</strong>
        </article>
        <article>
          <span>分类数量</span>
          <strong>{stats.categoryCount}</strong>
        </article>
      </div>

      <div className="admin-tools-toolbar">
        <div>
          <h2 id="admin-tools-title">工具列表</h2>
          <p>
            共 {filteredTools.length} / {tools.length} 条工具
          </p>
        </div>
        <div className="admin-tools-filters">
          <label>
            <span>标题搜索</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入工具标题"
            />
          </label>
          <label>
            <span>分类</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">全部分类</option>
              {categories.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">全部</option>
              <option value="visible">仅显示</option>
              <option value="hidden">已隐藏</option>
            </select>
          </label>
        </div>
      </div>

      {actionError && <p className="admin-table-action-error">{actionError}</p>}

      <div className="admin-table-wrap">
        <table className="admin-tools-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>标题</th>
              <th>分类</th>
              <th>子分类</th>
              <th>标签</th>
              <th>网址</th>
              <th>排序值</th>
              <th>是否显示</th>
              <th>添加日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTools.map((tool) => {
              const tags = normalizeTags(tool.tags);
              const domain = getDomain(tool);
              const isDeleting = busyRow?.id === tool.id && busyRow.action === "delete";
              const isToggling = busyRow?.id === tool.id && busyRow.action === "toggle";
              const isSavingSort = busyRow?.id === tool.id && busyRow.action === "sort";
              const sortValue = sortDrafts[tool.id] ?? tool.sort_order ?? 0;
              const hasSortChange = sortValue !== (tool.sort_order ?? 0);

              return (
                <tr key={tool.id}>
                  <td>
                    {tool.cover_url ? (
                      <img className="admin-cover-thumb" src={tool.cover_url} alt="" loading="lazy" />
                    ) : (
                      <span className="admin-cover-placeholder" aria-label="无封面" />
                    )}
                  </td>
                  <td className="admin-title-cell">{tool.title || "-"}</td>
                  <td>{tool.category || "-"}</td>
                  <td>{tool.subcategory || "-"}</td>
                  <td>
                    <div className="admin-tag-list">
                      {tags.length > 0 ? tags.map((tag) => <span key={tag}>{tag}</span>) : <span>-</span>}
                    </div>
                  </td>
                  <td>
                    {tool.url ? (
                      <a href={tool.url} target="_blank" rel="noreferrer">
                        {domain || "打开链接"}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <div className="admin-sort-editor">
                      <input
                        type="number"
                        min={0}
                        value={sortValue}
                        disabled={Boolean(busyRow)}
                        onChange={(event) =>
                          setSortDrafts((current) => ({
                            ...current,
                            [tool.id]: Number(event.target.value),
                          }))
                        }
                      />
                      {hasSortChange && (
                        <button type="button" disabled={Boolean(busyRow)} onClick={() => void saveSortOrder(tool)}>
                          {isSavingSort ? "保存中..." : "保存排序"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      className={tool.is_visible === true ? "admin-visibility-toggle visible" : "admin-visibility-toggle hidden"}
                      type="button"
                      disabled={Boolean(busyRow)}
                      onClick={() => void toggleVisible(tool)}
                    >
                      {isToggling ? "更新中..." : tool.is_visible === true ? "显示" : "隐藏"}
                    </button>
                  </td>
                  <td>{formatDate(tool.added_date)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="admin-row-action"
                        type="button"
                        disabled={Boolean(busyRow)}
                        onClick={() => onEdit?.(tool)}
                      >
                        编辑
                      </button>
                      <button
                        className="admin-row-action danger"
                        type="button"
                        disabled={Boolean(busyRow)}
                        onClick={() => void deleteTool(tool)}
                      >
                        {isDeleting ? "删除中..." : "删除"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
