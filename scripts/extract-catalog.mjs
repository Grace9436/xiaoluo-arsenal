import fs from "node:fs";
import path from "node:path";

const source = "D:\\资料\\xiaoer's 私人弹药库.html";
const outFile = path.resolve("src/data/catalog.ts");
const html = fs.readFileSync(source, "utf8");

const categoryIcons = {
  "视觉创作": "palette",
  "文字写作": "pen",
  "网页与代码": "code",
  "声音": "volume",
  "灵感与审美": "sparkles",
  "知识与学习": "book",
  "办公与效率": "briefcase",
  "兴趣娱乐": "gamepad",
  "资源集合": "archive",
  "出海与基建": "globe",
  "AI 大模型": "bot",
  "其他": "more",
};

function decodeEntities(value = "") {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
    .trim();
}

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]+>/g, "").replace(/\s+/g, " "));
}

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "");
}

const sourceDate = ((html.match(/<span>(\d{4}\.\d{2}\.\d{2})<\/span>/) ?? [])[1] ?? "2026.05.11").replaceAll(".", "-");
const cardPattern = /<a href="(https?:\/\/[^"]+)" target="_blank" rel="noopener" class="site-card[\s\S]*?<\/a>/g;
const cards = [...html.matchAll(cardPattern)].map((match, index) => {
  const block = match[0];
  const url = decodeEntities(match[1]);
  const title = stripTags((block.match(/<h3 class="site-title[^"]*">([\s\S]*?)<\/h3>/) ?? [])[1] ?? `Tool ${index + 1}`);
  const description = stripTags((block.match(/<p class="site-headline[^"]*">([\s\S]*?)<\/p>/) ?? [])[1] ?? "");
  const note = stripTags((block.match(/<span class="text-\[var\(--accent\)\]">小耳备注:<\/span>([\s\S]*?)<\/div>/) ?? [])[1] ?? "");
  const coverPath = decodeEntities((block.match(/background-image:\s*url\(&quot;(\/covers\/[^&]+)&quot;\)/) ?? [])[1] ?? "");
  const tagBlocks = [...block.matchAll(/<span class="tag-pill[\s\S]*?<\/span>/g)].map((item) => stripTags(item[0])).filter(Boolean);
  const category = tagBlocks[0] || "其他";
  const subcategory = tagBlocks[1] || undefined;
  const tags = tagBlocks.slice(1);

  return {
    id: `${index + 1}-${slug(title || domainFromUrl(url))}`,
    title,
    description,
    addedDate: sourceDate,
    url,
    domain: domainFromUrl(url),
    cover: coverPath ? `https://xiaoer-tools-wall.vercel.app${coverPath}` : "",
    category,
    subcategory,
    tags,
    note: note || undefined,
  };
});

const sidebarCounts = [...html.matchAll(/<span class="truncate">([^<]+) <span class="text-xs opacity-60">\((\d+)\)<\/span><\/span>/g)]
  .map((match) => ({ name: stripTags(match[1]), count: Number(match[2]) }))
  .filter((item, index, list) => item.name && list.findIndex((x) => x.name === item.name) === index);

const categories = sidebarCounts.map((item) => {
  const childrenMap = new Map();
  for (const tool of cards) {
    if (tool.category === item.name && tool.subcategory) {
      childrenMap.set(tool.subcategory, (childrenMap.get(tool.subcategory) || 0) + 1);
    }
  }
  const children = [...childrenMap.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([name, count]) => ({
      id: slug(`${item.name}-${name}`),
      name,
      count,
      icon: categoryIcons[item.name] || "tag",
    }));

  return {
    id: slug(item.name),
    name: item.name,
    count: item.count,
    icon: categoryIcons[item.name] || "tag",
    children,
  };
});

const quickLinks = [...html.matchAll(/<button class="prompt-chip[\s\S]*?<span class="relative inline-block whitespace-nowrap pb-1">([^<]+)<svg/g)]
  .map((match) => stripTags(match[1]))
  .filter((item, index, list) => item && list.indexOf(item) === index)
  .map((label) => ({
    label,
    query:
      {
        "PPT 神器": "PPT",
        "提示词工程": "提示词",
        "API 中转": "API",
        "AI 视频工具": "视频",
      }[label] || label,
  }));

const friendVisits = Number((html.match(/font-hand text-base text-\[var\(--ink\)\][^>]*>(\d+)<\/span><span class="text-\[11px\][^>]*>朋友来过/) ?? [])[1] ?? 10);
const toolCount = Number((html.match(/<span class="font-semibold text-\[var\(--ink\)\] tabular-nums">(\d+)<\/span> 工具/) ?? [])[1] ?? cards.length);
const todayAdded = Number((html.match(/今日新加\s*(\d+)/) ?? [])[1] ?? 1);
const date = sourceDate.replaceAll("-", ".");

const output = `import type { Category, SiteStats, Tool } from "../types";

export const siteStats: SiteStats = ${JSON.stringify({ date, toolCount, todayAdded, friendVisits }, null, 2)};

export const quickLinks: Array<{ label: string; query: string }> = ${JSON.stringify(quickLinks, null, 2)};

export const tools: Tool[] = ${JSON.stringify(cards, null, 2)};

export const categories: Category[] = ${JSON.stringify(categories, null, 2)};
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, output, "utf8");
console.log(`Extracted ${cards.length} tools, ${categories.length} categories, ${quickLinks.length} quick links.`);
