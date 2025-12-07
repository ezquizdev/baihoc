import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import styles from "./rich-text.module.css";

export function RichText({
  content,
  className = "",
  variant = "block",
  allowLinks = true,
}: {
  content: string | null | undefined;
  className?: string;
  variant?: "block" | "inline";
  allowLinks?: boolean;
}) {
  if (!content) return null;

  const classes = [
    styles.richText,
    variant === "inline" ? styles.inline : styles.block,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        skipHtml
        components={{
          a: allowLinks
            ? ({ node: _node, ...props }) => (
                <a {...props} target="_blank" rel="noreferrer noopener" />
              )
            : ({ children }) => <span>{children}</span>,
          img: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
