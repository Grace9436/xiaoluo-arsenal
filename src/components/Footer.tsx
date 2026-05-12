export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <span className="footer-label">XIAOLUO'S ARSENAL</span>
          <h2>小落的弹药库</h2>
          <p>复古数字朋克风格的个人 AI 工具导航站。内容来自原站工具墙，视觉重构为新粗野主义贴纸海报质感。</p>
        </div>
        <div className="contact-card">
          <span>CONTACT</span>
          <strong>Keep building. Keep collecting.</strong>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            返回顶部 ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
