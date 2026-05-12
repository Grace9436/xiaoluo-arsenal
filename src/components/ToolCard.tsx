import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { Tool } from "../types";

function ToolCover({ tool }: { tool: Tool }) {
  const [failed, setFailed] = useState(false);

  if (!tool.cover || failed) {
    return (
      <div className="tool-cover cover-fallback">
        <span>{tool.title}</span>
      </div>
    );
  }

  return (
    <div className="tool-cover">
      <img src={tool.cover} alt={`${tool.title} 截图`} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

type ToolCardProps = {
  tool: Tool;
  index: number;
};

export function ToolCard({ tool, index }: ToolCardProps) {
  return (
    <a
      className="site-card"
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ "--card-tilt": `${index % 5 === 0 ? -0.45 : index % 7 === 0 ? 0.45 : 0}deg` } as CSSProperties}
    >
      <div className="card-window-bar">
        <span />
        <span />
        <span />
        <ExternalLink size={15} strokeWidth={3} />
      </div>
      <ToolCover tool={tool} />
      <div className="card-body">
        <h3>{tool.title}</h3>
        <p>{tool.description}</p>
        {tool.note && (
          <div className="tool-note">
            <span>小落备注:</span> {tool.note}
          </div>
        )}
        <div className="tag-list">
          <span className="tag-pill primary">{tool.category}</span>
          {tool.tags.slice(0, 4).map((tag, tagIndex) => (
            <span className="tag-pill" data-tone={tagIndex % 3} key={`${tool.id}-${tag}-${tagIndex}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="site-card-footer">{tool.domain}</div>
    </a>
  );
}
