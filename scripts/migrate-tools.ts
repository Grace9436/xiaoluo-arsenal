import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";
import { tools } from "../src/data/catalog";
import type { Tool } from "../src/types";

type LocalTool = Partial<Tool> & {
  added_date?: unknown;
  cover_url?: unknown;
  remark?: unknown;
  tags?: unknown;
};

type ToolInsert = {
  title: string;
  description: string;
  url: string;
  domain: string;
  cover_url: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  note: string | null;
  sort_order: number;
  is_visible: boolean;
  added_date: string;
};

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const BATCH_SIZE = 100;

config({ path: ENV_PATH });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readTags(value: unknown): string[] {
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
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function mapToolToInsert(tool: LocalTool, index: number): ToolInsert {
  const url = readString(tool.url);

  return {
    title: readString(tool.title),
    description: readString(tool.description),
    url,
    domain: readString(tool.domain) || getDomain(url),
    cover_url: readString(tool.cover) || readString(tool.cover_url),
    category: readString(tool.category),
    subcategory: readString(tool.subcategory) || null,
    tags: readTags(tool.tags),
    note: readString(tool.note) || readString(tool.remark) || null,
    sort_order: index,
    is_visible: true,
    added_date: readString(tool.addedDate) || readString(tool.added_date) || getTodayDate(),
  };
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { count, error: countError } = await supabase
    .from("tools")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Failed to check existing tools data:", countError.message);
    process.exitCode = 1;
    return;
  }

  if ((count ?? 0) > 0) {
    console.warn(`Supabase tools table already has ${count} rows. Migration stopped to avoid duplicate imports.`);
    return;
  }

  const rows = tools.map((tool, index) => mapToolToInsert(tool, index));
  const failures: Array<{ start: number; end: number; message: string }> = [];
  let successCount = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const { error } = await supabase.from("tools").insert(batch);

    if (error) {
      failures.push({
        start,
        end: start + batch.length - 1,
        message: error.message,
      });
      continue;
    }

    successCount += batch.length;
  }

  console.log(`Total local tools: ${rows.length}`);
  console.log(`Successfully imported: ${successCount}`);

  if (failures.length > 0) {
    console.error("Failed batches:");
    for (const failure of failures) {
      console.error(`- rows ${failure.start}-${failure.end}: ${failure.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Tools migration completed.");
}

void main();
