import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { AdminLogin } from "./AdminLogin";
import { AdminToolForm } from "./AdminToolForm";
import { AdminToolsList } from "./AdminToolsList";
import type { AdminToolRow } from "./AdminToolsList";

type AdminStatus = "checking" | "login" | "admin";
type AdminView = "list" | "create" | "edit";

export function AdminPanel() {
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeView, setActiveView] = useState<AdminView>("list");
  const [toolsRefreshKey, setToolsRefreshKey] = useState(0);
  const [editingTool, setEditingTool] = useState<AdminToolRow | null>(null);
  const [notice, setNotice] = useState("");

  const verifyAdminUser = useCallback(async (user: User): Promise<boolean> => {
    if (!supabase) {
      setErrorMessage("Supabase 未配置");
      return false;
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      setEmail("");
      setStatus("login");
      setErrorMessage("无后台权限");
      return false;
    }

    setEmail(user.email ?? "");
    setErrorMessage("");
    setStatus("admin");
    return true;
  }, []);

  useEffect(() => {
    let ignore = false;

    const checkSession = async () => {
      if (!supabase) {
        if (!ignore) {
          setErrorMessage("Supabase 未配置");
          setStatus("login");
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (ignore) {
        return;
      }

      if (error || !data.session?.user) {
        setStatus("login");
        return;
      }

      await verifyAdminUser(data.session.user);
    };

    void checkSession();

    return () => {
      ignore = true;
    };
  }, [verifyAdminUser]);

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setEmail("");
    setErrorMessage("");
    setActiveView("list");
    setEditingTool(null);
    setNotice("");
    setStatus("login");
  };

  const showList = () => {
    setActiveView("list");
    setEditingTool(null);
  };

  const editTool = (tool: AdminToolRow) => {
    setEditingTool(tool);
    setNotice("");
    setActiveView("edit");
  };

  const refreshTools = () => {
    setToolsRefreshKey((value) => value + 1);
  };

  if (status === "checking") {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <p className="admin-eyebrow">Admin Console</p>
          <h1>正在检查登录状态...</h1>
        </section>
      </main>
    );
  }

  if (status === "login") {
    return <AdminLogin errorMessage={errorMessage} onAuthenticated={verifyAdminUser} />;
  }

  return (
    <main className="admin-shell">
      <section className="admin-dashboard">
        <header className="admin-dashboard-header">
          <div>
            <p className="admin-eyebrow">Admin Console</p>
            <h1>小落的弹药库 · 后台管理</h1>
            <p className="admin-muted">当前登录邮箱：{email || "未获取"}</p>
          </div>
          <button type="button" onClick={logout}>
            退出登录
          </button>
        </header>

        <nav className="admin-tabs" aria-label="后台导航">
          <button
            type="button"
            className={activeView === "list" ? "active" : ""}
            onClick={showList}
          >
            工具列表
          </button>
          <button
            type="button"
            className={activeView === "create" ? "active" : ""}
            onClick={() => {
              setEditingTool(null);
              setNotice("");
              setActiveView("create");
            }}
          >
            新增工具
          </button>
        </nav>

        {notice && <p className="admin-notice">{notice}</p>}

        {activeView === "list" ? (
          <AdminToolsList refreshKey={toolsRefreshKey} onEdit={editTool} />
        ) : activeView === "edit" && editingTool ? (
          <AdminToolForm
            mode="edit"
            initialTool={editingTool}
            onCancel={showList}
            onSaved={() => {
              refreshTools();
              setNotice("保存成功");
              showList();
            }}
          />
        ) : (
          <AdminToolForm
            mode="create"
            onSaved={() => {
              refreshTools();
              setNotice("新增成功");
            }}
          />
        )}
      </section>
    </main>
  );
}
