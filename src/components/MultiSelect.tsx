"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type Option = {
  value: string;
  label: string;
  hint?: string;
  dotClass?: string;
};

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  align?: "left" | "right";
};

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  align = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.hint?.toLowerCase().includes(needle),
    );
  }, [options, query]);

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const count = selected.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={listId}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
          count > 0
            ? "border-line-strong bg-panel-hover text-fg"
            : "border-line bg-panel text-fg-muted hover:border-line-strong hover:text-fg"
        }`}
      >
        <span className="font-medium">{label}</span>
        {count > 0 ? (
          <span className="rounded-full bg-fg px-1.5 py-px font-mono text-[11px] leading-4 text-bg">
            {count}
          </span>
        ) : null}
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          className={`absolute z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-panel shadow-xl shadow-black/5 dark:shadow-black/40 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {searchable ? (
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                className="h-8 w-full rounded-lg border border-line bg-bg px-2.5 text-sm outline-none placeholder:text-fg-faint focus:border-line-strong"
              />
            </div>
          ) : null}

          <div className="scrollbar-thin max-h-72 overflow-y-auto py-1">
            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-fg-faint">No matches</p>
            ) : (
              visible.map((option) => {
                const active = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-panel-hover"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        active
                          ? "border-fg bg-fg text-bg"
                          : "border-line-strong bg-transparent"
                      }`}
                    >
                      {active ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          aria-hidden="true"
                        >
                          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </span>
                    {option.dotClass ? (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClass}`} />
                    ) : null}
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="shrink-0 font-mono text-[11px] text-fg-faint">
                        {option.hint}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {count > 0 ? (
            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-panel-hover hover:text-fg"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
