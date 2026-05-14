import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { AdminToolRow } from "./AdminToolsList";

type AdminToolFormMode = "create" | "edit";

type AdminToolFormProps = {
  initialTool?: AdminToolRow | null;
  mode?: AdminToolFormMode;
  onSaved?: () => void;
  onCancel?: () => void;
};

type ToolPayload = {
  title: string;
  url: string;
  domain: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  note: string | null;
  cover_url: string | null;
  added_date: string;
  sort_order: number;
  is_visible: boolean;
};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToInput(value: AdminToolRow["tags"] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return typeof value === "string" ? value : "";
}

function makeSafeFileName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cover"
  );
}

export function AdminToolForm({ initialTool = null, mode = "create", onSaved, onCancel }: AdminToolFormProps) {
  const isEditMode = mode === "edit";
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [addedDate, setAddedDate] = useState(getTodayDate());
  const [sortOrder, setSortOrder] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const domain = useMemo(() => extractDomain(url.trim()), [url]);

  useEffect(() => {
    if (!isEditMode || !initialTool) {
      return;
    }

    setTitle(initialTool.title ?? "");
    setUrl(initialTool.url ?? "");
    setDescription(initialTool.description ?? "");
    setCategory(initialTool.category ?? "");
    setSubcategory(initialTool.subcategory ?? "");
    setTags(tagsToInput(initialTool.tags));
    setNote(initialTool.note ?? "");
    setCoverUrl(initialTool.cover_url ?? "");
    setAddedDate(initialTool.added_date?.slice(0, 10) || getTodayDate());
    setSortOrder(typeof initialTool.sort_order === "number" ? initialTool.sort_order : 0);
    setIsVisible(initialTool.is_visible === true);
    setMessage("");
    setErrorMessage("");
  }, [initialTool, isEditMode]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    let ignore = false;

    const loadNextSortOrder = async () => {
      if (!supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("tools")
        .select("sort_order")
        .order("sort_order", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (ignore || error) {
        return;
      }

      const maxSortOrder = typeof data?.sort_order === "number" ? data.sort_order : -1;
      setSortOrder(maxSortOrder + 1);
    };

    void loadNextSortOrder();

    return () => {
      ignore = true;
    };
  }, [isEditMode]);

  const resetForm = (nextSortOrder: number) => {
    setTitle("");
    setUrl("");
    setDescription("");
    setCategory("");
    setSubcategory("");
    setTags("");
    setNote("");
    setCoverUrl("");
    setAddedDate(getTodayDate());
    setSortOrder(nextSortOrder);
    setIsVisible(true);
  };

  const uploadCover = async (file: File) => {
    setMessage("");
    setErrorMessage("");

    if (!supabase) {
      setErrorMessage("Supabase 未配置");
      return;
    }

    const path = `tools/${Date.now()}-${makeSafeFileName(file.name)}`;
    setIsUploadingCover(true);

    const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: true });

    if (error) {
      setErrorMessage(error.message || "封面上传失败");
      setIsUploadingCover(false);
      return;
    }

    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    setMessage("封面上传成功");
    setIsUploadingCover(false);
  };

  const submitTool = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (isUploadingCover) {
      setErrorMessage("封面上传中，请稍后再保存");
      return;
    }

    if (!supabase) {
      setErrorMessage("Supabase 未配置");
      return;
    }

    if (isEditMode && !initialTool?.id) {
      setErrorMessage("缺少要编辑的工具 ID");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle || !trimmedUrl) {
      setErrorMessage("请填写工具名称和网站网址");
      return;
    }

    const payload: ToolPayload = {
      title: trimmedTitle,
      url: trimmedUrl,
      domain,
      description: description.trim() || null,
      category: category.trim() || null,
      subcategory: subcategory.trim() || null,
      tags: parseTags(tags),
      note: note.trim() || null,
      cover_url: coverUrl.trim() || null,
      added_date: addedDate || getTodayDate(),
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_visible: isVisible,
    };

    setIsSubmitting(true);

    const { error } = isEditMode
      ? await supabase.from("tools").update(payload).eq("id", initialTool?.id)
      : await supabase.from("tools").insert(payload);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || (isEditMode ? "保存失败" : "新增失败"));
      return;
    }

    setMessage(isEditMode ? "保存成功" : "新增成功");

    if (!isEditMode) {
      resetForm(payload.sort_order + 1);
    }

    onSaved?.();
  };

  return (
    <section className="admin-form-panel" aria-labelledby="admin-tool-form-title">
      <div className="admin-form-heading">
        <h2 id="admin-tool-form-title">{isEditMode ? "编辑工具" : "新增工具"}</h2>
        <p>{isEditMode ? "修改工具信息后保存到 Supabase tools 表。" : "填写基础信息后保存到 Supabase tools 表。"}</p>
      </div>

      <form className="admin-tool-form" onSubmit={submitTool}>
        <label>
          <span>工具名称 *</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          <span>网站网址 *</span>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            required
          />
        </label>

        <label>
          <span>自动提取 domain</span>
          <input value={domain} readOnly placeholder="输入网址后自动生成" />
        </label>

        <label className="admin-form-wide">
          <span>简介</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>

        <label>
          <span>分类</span>
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>

        <label>
          <span>子分类</span>
          <input value={subcategory} onChange={(event) => setSubcategory(event.target.value)} />
        </label>

        <label>
          <span>标签</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="AI, PPT, 视频" />
        </label>

        <label>
          <span>封面图片 URL</span>
          <input type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
        </label>

        <label>
          <span>上传封面图片</span>
          <input
            type="file"
            accept="image/*"
            disabled={isUploadingCover}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void uploadCover(file);
              }
              event.target.value = "";
            }}
          />
        </label>

        <div className="admin-cover-preview admin-form-wide">
          {coverUrl ? <img src={coverUrl} alt="封面预览" /> : <span>暂无封面预览</span>}
          {isUploadingCover && <strong>上传中...</strong>}
        </div>

        <label className="admin-form-wide">
          <span>小落备注</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
        </label>

        <label>
          <span>添加日期</span>
          <input type="date" value={addedDate} onChange={(event) => setAddedDate(event.target.value)} />
        </label>

        <label>
          <span>排序值</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
            min={0}
          />
        </label>

        <label className="admin-checkbox-row">
          <input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} />
          <span>是否显示</span>
        </label>

        {(message || errorMessage) && (
          <p className={errorMessage ? "admin-error" : "admin-success"}>{errorMessage || message}</p>
        )}

        <div className="admin-form-actions">
          <button type="submit" disabled={isSubmitting || isUploadingCover}>
            {isUploadingCover ? "上传中..." : isSubmitting ? "保存中..." : isEditMode ? "保存修改" : "保存工具"}
          </button>
          {isEditMode && (
            <button className="secondary" type="button" onClick={onCancel} disabled={isSubmitting || isUploadingCover}>
              取消
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
