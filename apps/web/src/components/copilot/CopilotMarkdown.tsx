import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CopilotMarkdownProps {
  content: string;
}

export const CopilotMarkdown: React.FC<CopilotMarkdownProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to render inline formatting: bold, italic, code, links, status badges
  const renderInline = (text: string): React.ReactNode => {
    // Regex for inline code: `code`
    // Regex for bold: **bold**
    // Regex for link: [text](url)
    // Regex for operational pills: [P1 CRITICAL], [HIGH], #TCK-..., #WO-..., etc.

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Split and parse inline tokens
    const inlineRegex = /(\*\*.*?\*\*|`[^`]+`|\[[A-Z0-9_\-\s]{2,20}\]|#[A-Z]{2,4}-[0-9A-Za-z]+|https?:\/\/[^\s)]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-ink">
            {token.slice(2, -2)}
          </strong>,
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={keyIdx++}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-900 border border-zinc-200/80 font-medium"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else if (token.startsWith('[') && token.endsWith(']')) {
        const tag = token.slice(1, -1).trim();
        const upper = tag.toUpperCase();

        if (upper.includes('P1') || upper.includes('CRITICAL')) {
          parts.push(
            <span
              key={keyIdx++}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200"
            >
              ● {tag}
            </span>,
          );
        } else if (upper.includes('P2') || upper.includes('HIGH') || upper.includes('LOW_STOCK')) {
          parts.push(
            <span
              key={keyIdx++}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200"
            >
              ▲ {tag}
            </span>,
          );
        } else if (
          upper.includes('RESOLVED') ||
          upper.includes('IN_STOCK') ||
          upper.includes('AVAILABLE') ||
          upper.includes('COMPLETED')
        ) {
          parts.push(
            <span
              key={keyIdx++}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              ✓ {tag}
            </span>,
          );
        } else {
          parts.push(
            <span
              key={keyIdx++}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200"
            >
              {tag}
            </span>,
          );
        }
      } else if (token.startsWith('#')) {
        parts.push(
          <span
            key={keyIdx++}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            {token}
          </span>,
        );
      } else if (token.startsWith('http')) {
        parts.push(
          <a
            key={keyIdx++}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            {token}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>,
        );
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Parse lines into high-level blocks: code block, table, headers, lists, paragraphs
  const renderBlocks = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let blockIdx = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code blocks (```lang ... ```)
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'code';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        const fullCode = codeLines.join('\n');
        const currentIdx = blockIdx++;

        elements.push(
          <div
            key={`code-${currentIdx}`}
            className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-zinc-300">
                <Terminal className="w-3 h-3 text-primary" />
                {lang}
              </span>
              <button
                onClick={() => handleCopyCode(fullCode, currentIdx)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title="Copy code"
              >
                {copiedIndex === currentIdx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-sans">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px] font-sans">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto selection:bg-indigo-500/30">
              {fullCode}
            </pre>
          </div>,
        );
        continue;
      }

      // Tables (lines starting and ending with | or containing multiple |)
      if (line.trim().startsWith('|') && line.includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCols = tableLines[0]
            .split('|')
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

          // Find data lines (skipping separator line like |---|---|)
          const dataRows = tableLines.slice(1).filter((l) => !l.match(/^\|?\s*[-:]+[-| :]*\|?$/));

          elements.push(
            <div
              key={`table-${blockIdx++}`}
              className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-white shadow-2xs"
            >
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-zinc-50 border-b border-border/80">
                  <tr>
                    {headerCols.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="py-2 px-3 font-poppins font-semibold text-ink text-[10.5px] uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {dataRows.map((rowStr, rIdx) => {
                    const rowCols = rowStr
                      .split('|')
                      .map((c) => c.trim())
                      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                    return (
                      <tr
                        key={rIdx}
                        className="hover:bg-zinc-50/70 transition-colors odd:bg-white even:bg-[#FAFAFA]"
                      >
                        {rowCols.map((col, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 text-ink-soft">
                            {renderInline(col)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>,
          );
          continue;
        }
      }

      // Headers (###, ##, #)
      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={`h4-${blockIdx++}`}
            className="font-poppins font-bold text-xs text-ink mt-3 mb-1.5 tracking-tight flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {renderInline(line.slice(4))}
          </h4>,
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3
            key={`h3-${blockIdx++}`}
            className="font-poppins font-bold text-sm text-ink mt-4 mb-2 tracking-tight"
          >
            {renderInline(line.slice(3))}
          </h3>,
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2
            key={`h2-${blockIdx++}`}
            className="font-poppins font-extrabold text-base text-ink mt-4 mb-2 tracking-tight"
          >
            {renderInline(line.slice(2))}
          </h2>,
        );
        i++;
        continue;
      }

      // Blockquote (> ...)
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`quote-${blockIdx++}`}
            className="border-l-2 border-indigo-500 bg-indigo-50/50 pl-3 py-1.5 my-2 rounded-r-lg text-[11px] text-ink-soft italic leading-relaxed"
          >
            {renderInline(line.slice(2))}
          </blockquote>,
        );
        i++;
        continue;
      }

      // Bullet List (- or *)
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletLines: string[] = [];
        while (
          i < lines.length &&
          (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
        ) {
          bulletLines.push(lines[i].trim().substring(2));
          i++;
        }
        elements.push(
          <ul key={`ul-${blockIdx++}`} className="space-y-1.5 my-2 pl-1">
            {bulletLines.map((bText, bIdx) => (
              <li key={bIdx} className="flex items-start gap-2 text-ink-soft leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/80 mt-1.5 shrink-0" />
                <span className="flex-1">{renderInline(bText)}</span>
              </li>
            ))}
          </ul>,
        );
        continue;
      }

      // Numbered List (1. ...)
      if (/^\s*\d+\.\s/.test(line)) {
        const numLines: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
          numLines.push(lines[i].replace(/^\s*\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={`ol-${blockIdx++}`} className="space-y-1.5 my-2 pl-1">
            {numLines.map((nText, nIdx) => (
              <li key={nIdx} className="flex items-start gap-2 text-ink-soft leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-zinc-100 text-zinc-700 font-mono text-[9px] font-bold flex items-center justify-center mt-0.5 shrink-0 border border-zinc-200">
                  {nIdx + 1}
                </span>
                <span className="flex-1">{renderInline(nText)}</span>
              </li>
            ))}
          </ol>,
        );
        continue;
      }

      // Empty line / spacer
      if (!line.trim()) {
        i++;
        continue;
      }

      // Normal paragraph line
      elements.push(
        <p key={`p-${blockIdx++}`} className="leading-relaxed text-ink-soft my-1">
          {renderInline(line)}
        </p>,
      );
      i++;
    }

    return elements;
  };

  return <div className="space-y-1 text-xs font-sans break-words">{renderBlocks()}</div>;
};
