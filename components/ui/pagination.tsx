"use client";

import { Icon } from "@/components/ui/icon";

export type PaginationProps = {
  /** 1-based active page number. */
  page: number;
  /** Number of items requested per page. */
  pageSize: number;
  /** Total record count across all pages. */
  totalItems: number;
  /** Optional explicit total page count from the API. */
  totalPages?: number;
  /** Selectable rows-per-page options. */
  pageSizeOptions?: readonly number[];
  /** Called with the target 1-based page number. */
  onPageChange: (nextPage: number) => void;
  /** Called when the user selects a different page size. */
  onPageSizeChange?: (nextPageSize: number) => void;
  /** Disables navigation controls while data is loading. */
  disabled?: boolean;
  /** Noun displayed in the summary range, e.g. "customers" or "orders". */
  itemLabel?: string;
  className?: string;
};

type PageToken = number | "ellipsis-left" | "ellipsis-right";

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;

function buildPageWindow(current: number, total: number): PageToken[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const tokens: PageToken[] = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);

  if (windowStart > 2) {
    tokens.push("ellipsis-left");
  } else {
    for (let page = 2; page < windowStart; page += 1) {
      tokens.push(page);
    }
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    tokens.push(page);
  }

  if (windowEnd < total - 1) {
    tokens.push("ellipsis-right");
  } else {
    for (let page = windowEnd + 1; page < total; page += 1) {
      tokens.push(page);
    }
  }

  tokens.push(total);
  return tokens;
}

/**
 * Reusable, responsive pagination bar with rows-per-page selector,
 * range summary, and smart ellipsis page buttons.
 */
export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages: totalPagesProp,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  itemLabel = "items",
  className = "",
}: PaginationProps) {
  const safeTotalItems = Math.max(0, totalItems);
  const safePageSize = Math.max(1, pageSize);
  const computedTotalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const totalPages = Math.max(1, totalPagesProp ?? computedTotalPages);
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startItem = safeTotalItems === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const endItem =
    safeTotalItems === 0 ? 0 : Math.min(safeTotalItems, currentPage * safePageSize);
  const tokens = buildPageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-col gap-3 border-t border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <span>Items per page:</span>
            <span className="relative inline-flex items-center">
              <select
                aria-label="Items per page"
                value={safePageSize}
                disabled={disabled}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                style={{ WebkitAppearance: "none", appearance: "none" }}
                className="h-8 cursor-pointer appearance-none rounded-xl border border-line bg-page pr-7 pl-2.5 text-xs font-semibold text-ink outline-none transition hover:border-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron"
                className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted"
              />
            </span>
          </label>
        ) : null}

        <p className="text-xs text-muted tabular-nums">
          {safeTotalItems === 0 ? (
            <span>0 of 0 {itemLabel}</span>
          ) : (
            <span>
              <strong className="font-semibold text-ink">
                {startItem}–{endItem}
              </strong>{" "}
              of <strong className="font-semibold text-ink">{safeTotalItems}</strong> {itemLabel}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-1.5 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1 || safeTotalItems === 0}
          aria-label="Previous page"
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-line bg-page px-2.5 text-xs font-semibold text-ink transition hover:border-primary hover:bg-mint/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:bg-page disabled:hover:text-ink"
        >
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <span className="px-2 text-xs font-medium text-muted tabular-nums sm:hidden">
          Page <strong className="font-semibold text-ink">{safeTotalItems === 0 ? 0 : currentPage}</strong>{" "}
          / {safeTotalItems === 0 ? 0 : totalPages}
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          {tokens.map((token) => {
            if (typeof token !== "number") {
              return (
                <span
                  key={token}
                  aria-hidden="true"
                  className="grid h-9 w-7 place-items-center text-xs font-medium text-muted"
                >
                  &hellip;
                </span>
              );
            }

            const active = token === currentPage && safeTotalItems > 0;
            return (
              <button
                key={token}
                type="button"
                onClick={() => {
                  if (!active) onPageChange(token);
                }}
                disabled={disabled || safeTotalItems === 0}
                aria-current={active ? "page" : undefined}
                aria-label={`Page ${token}`}
                className={`grid h-9 min-w-9 place-items-center rounded-xl px-2.5 text-xs font-semibold tabular-nums transition ${
                  active
                    ? "cursor-default bg-primary text-on-primary shadow-xs"
                    : "cursor-pointer border border-line bg-page text-ink hover:border-primary hover:bg-mint/60 hover:text-primary"
                } ${disabled || safeTotalItems === 0 ? "disabled:cursor-not-allowed disabled:opacity-50" : ""}`}
              >
                {token}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages || safeTotalItems === 0}
          aria-label="Next page"
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-line bg-page px-2.5 text-xs font-semibold text-ink transition hover:border-primary hover:bg-mint/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:bg-page disabled:hover:text-ink"
        >
          <span className="hidden sm:inline">Next</span>
          <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
        </button>
      </div>
    </nav>
  );
}
