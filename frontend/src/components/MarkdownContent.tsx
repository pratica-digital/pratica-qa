import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

type MarkdownContentProps = {
  className?: string;
  content?: string | null;
  fallback?: ReactNode;
};

export function MarkdownContent({ className = '', content, fallback = null }: MarkdownContentProps) {
  if (!content?.trim()) {
    return fallback === null ? null : <>{fallback}</>;
  }

  return (
    <div className={`min-w-0 break-words ${className}`.trim()}>
      <ReactMarkdown
        components={{
          a: ({ children, href, title }) => (
            <a
              className="text-blue-700 underline underline-offset-2 hover:text-blue-800"
              href={href}
              rel="noreferrer noopener"
              target="_blank"
              title={title}
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-semibold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-base font-semibold first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h4>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>,
        }}
        remarkPlugins={[remarkBreaks]}
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
