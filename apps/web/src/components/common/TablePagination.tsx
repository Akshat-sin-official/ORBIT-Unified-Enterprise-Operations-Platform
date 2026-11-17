import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  pageSize?: number;
  className?: string;
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems: items.length,
    startIndex: items.length > 0 ? startIndex + 1 : 0,
    endIndex,
    paginatedItems,
    pageSize,
  };
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  setCurrentPage,
  className = '',
}) => {
  if (totalItems <= 10 && totalPages <= 1) {
    return (
      <div className={`px-4 py-3 border-t border-border/70 bg-[#FBFBFA]/60 flex items-center justify-between text-xs text-muted-foreground ${className}`}>
        <span>Showing {totalItems} of {totalItems} entries</span>
        <span className="font-mono text-[11px] text-muted-foreground/60">Page 1 of 1</span>
      </div>
    );
  }

  // Calculate visible page range (up to 5 page numbers)
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className={`px-4 py-3 border-t border-border/70 bg-[#FBFBFA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1.5 font-sans">
        <span>Showing</span>
        <span className="font-bold text-ink">{startIndex}</span>
        <span>to</span>
        <span className="font-bold text-ink">{endIndex}</span>
        <span>of</span>
        <span className="font-bold text-ink">{totalItems}</span>
        <span>entries (limit: 10/page)</span>
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="h-7 w-7 text-ink disabled:opacity-40 hover:bg-zinc-100"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 text-ink disabled:opacity-40 hover:bg-zinc-100"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-poppins transition-colors ${
                num === currentPage
                  ? 'bg-primary text-white font-bold shadow-2xs'
                  : 'text-ink hover:bg-zinc-100 border border-transparent'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 text-ink disabled:opacity-40 hover:bg-zinc-100"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 text-ink disabled:opacity-40 hover:bg-zinc-100"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
