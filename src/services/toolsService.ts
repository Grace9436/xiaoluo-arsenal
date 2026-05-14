import { tools as fallbackTools } from "../data/catalog";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Tool } from "../types";

type ToolRow = Partial<Tool> & {
  added_date?: unknown;
  cover_url?: unknown;
  created_at?: unknown;
  sort_order?: unknown;
  is_visible?: unknown;
  [key: string]: unknown;
};

const readString = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

const readTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

const getDateFromTimestamp = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const normalizeToolRow = (row: ToolRow, index: number): Tool | null => {
  const title = readString(row.title);
  const url = readString(row.url);

  if (!title || !url) {
    return null;
  }

  const addedDate =
    readString(row.addedDate) ||
    readString(row.added_date) ||
    getDateFromTimestamp(row.created_at);

  return {
    id: readString(row.id) || `${index + 1}-${title}`,
    title,
    description: readString(row.description),
    addedDate,
    url,
    domain: readString(row.domain) || getDomain(url),
    cover: readString(row.cover) || readString(row.cover_url),
    category: readString(row.category) || "未分类",
    subcategory: readString(row.subcategory) || undefined,
    tags: readTags(row.tags),
    note: readString(row.note) || undefined,
  };
};

export const fetchTools = async (): Promise<Tool[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackTools;
  }

  try {
    const { data, error } = await supabase
      .from("tools")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (error || !Array.isArray(data)) {
      console.warn("Failed to fetch tools from Supabase. Using fallback data.", error);
      return fallbackTools;
    }

    const normalizedTools = data
      .map((row, index) => normalizeToolRow(row as ToolRow, index))
      .filter((tool): tool is Tool => tool !== null);

    if (normalizedTools.length === 0) {
      console.warn("Supabase returned no compatible tools. Using fallback data.");
      return fallbackTools;
    }

    return normalizedTools;
  } catch (error) {
    console.warn("Unexpected Supabase tools fetch failure. Using fallback data.", error);
    return fallbackTools;
  }
};
