import { FormEvent, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type AdminLoginProps = {
  errorMessage: string;
  onAuthenticated: (user: User) => Promise<boolean>;
};

export function AdminLogin({ errorMessage, onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!supabase) {
      setLocalError("Supabase 未配置");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setLocalError(error?.message || "登录失败");
      setIsSubmitting(false);
      return;
    }

    const isAdmin = await onAuthenticated(data.user);

    if (!isAdmin) {
      setLocalError("无后台权限");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <main className="admin-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div>
          <p className="admin-eyebrow">Admin Console</p>
          <h1 id="admin-login-title">小落的弹药库 · 后台管理</h1>
          <p className="admin-muted">使用 Supabase Auth 管理员账号登录。</p>
        </div>

        <form className="admin-login-form" onSubmit={submitLogin}>
          <label>
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {(localError || errorMessage) && <p className="admin-error">{localError || errorMessage}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}
