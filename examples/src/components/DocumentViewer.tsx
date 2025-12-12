import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";
import "../styles/components/DocumentViewer.css";

type DocItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  path: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  document: "根目录",
  permission: "权限",
  logic: "逻辑",
  examples: "示例",
};

const DOC_ITEMS: DocItem[] = (() => {
  // Use Vite alias to load markdowns from the root /document directory
  const modules = import.meta.glob("@document/**/*.md", { as: "raw", eager: true });

  return Object.entries(modules).map(([path, content]) => {
    const segments = path.split("/");
    const fileName = segments.pop() || "";
    const parent = segments.pop() || "document";
    const categoryKey = parent === "document" ? parent : parent;
    const title = fileName
      .replace(/\.md$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return {
      id: path,
      title,
      category: CATEGORY_LABELS[categoryKey] || categoryKey,
      content: String(content),
      path,
    };
  });
})();

interface DocumentViewerProps {
  onClose: () => void;
}

export default function DocumentViewer({ onClose }: DocumentViewerProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>(DOC_ITEMS[0]?.id ?? "");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const markdownContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredDocs = useMemo(() => {
    const lower = keyword.toLowerCase().trim();
    if (!lower) return DOC_ITEMS;
    return DOC_ITEMS.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lower) ||
        doc.category.toLowerCase().includes(lower) ||
        doc.path.toLowerCase().includes(lower)
    );
  }, [keyword]);

  useEffect(() => {
    if (filteredDocs.length === 0) return;
    if (!filteredDocs.some((doc) => doc.id === selectedDocId)) {
      setSelectedDocId(filteredDocs[0].id);
    }
  }, [filteredDocs, selectedDocId]);

  const selectedDoc =
    filteredDocs.find((doc) => doc.id === selectedDocId) ||
    DOC_ITEMS.find((doc) => doc.id === selectedDocId);

  const groupedDocs = useMemo(() => {
    return filteredDocs.reduce<Record<string, DocItem[]>>((acc, doc) => {
      acc[doc.category] = acc[doc.category] ? [...acc[doc.category], doc] : [doc];
      return acc;
    }, {});
  }, [filteredDocs]);

  // 初始化并在文档变更时渲染 Mermaid
  useEffect(() => {
    if (!selectedDoc) return;
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
    const timer = requestAnimationFrame(() => {
      const container = markdownContainerRef.current;
      if (!container) return;
      // 清理旧的渲染结果，避免节点错位
      container.querySelectorAll(".mermaid-rendered").forEach((node) => node.remove());

      const mermaidBlocks = container.querySelectorAll<HTMLElement>("code.language-mermaid");
      mermaidBlocks.forEach((block) => {
        const parent = block.parentElement;
        if (!parent) return;
        const code = block.textContent || "";
        const renderTarget = document.createElement("div");
        renderTarget.className = "mermaid mermaid-rendered";
        // 将渲染结果放在原 pre 后面，保留原节点以避免 React diff 冲突
        parent.insertAdjacentElement("afterend", renderTarget);
        // 隐藏原始 pre
        (parent as HTMLElement).style.display = "none";
        mermaid
          .render(`mermaid-${Math.random().toString(36).slice(2, 8)}`, code)
          .then(({ svg }) => {
            renderTarget.innerHTML = svg;
          })
          .catch((err) => {
            renderTarget.innerHTML = `<pre class="mermaid-error">${String(err)}</pre>`;
          });
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedDoc]);

  return (
    <div className="doc-viewer-overlay">
      <div className="doc-viewer">
        <header className="doc-header">
          <div>
            <h2>文档中心</h2>
            <p className="doc-subtitle">ERC-3643 原理及应用</p>
          </div>
          <div className="doc-actions">
            <button
              className="doc-toggle-sidebar-btn"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              title={sidebarVisible ? "隐藏目录" : "显示目录"}
            >
              {sidebarVisible ? "◀" : "▶"}
            </button>
            <input
              className="doc-search"
              placeholder="搜索文件名或路径..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button className="doc-close-btn" onClick={onClose}>
              关闭
            </button>
          </div>
        </header>

        <div className={`doc-body ${sidebarVisible ? "" : "sidebar-hidden"}`}>
          <aside className={`doc-sidebar ${sidebarVisible ? "" : "hidden"}`}>
            {filteredDocs.length === 0 ? (
              <div className="doc-empty">未找到匹配的文档</div>
            ) : (
              Object.entries(groupedDocs).map(([category, docs]) => (
                <div key={category} className="doc-group">
                  <div className="doc-group-title">{category}</div>
                  <ul className="doc-list">
                    {docs.map((doc) => (
                      <li
                        key={doc.id}
                        className={doc.id === selectedDocId ? "active" : ""}
                        onClick={() => setSelectedDocId(doc.id)}
                      >
                        {doc.title}
                        <span className="doc-list-path">{doc.path.replace(/^.*document\//, "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </aside>

          <section className="doc-content">
            {selectedDoc ? (
              <>
                <div className="doc-content-header">
                  <div>
                    <div className="doc-file-name">{selectedDoc.title}</div>
                    <div className="doc-file-path">{selectedDoc.path}</div>
                  </div>
                </div>
            
                <div className="doc-markdown" ref={markdownContainerRef}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}
                  >{selectedDoc.content}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="doc-empty">请选择一篇文档</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

