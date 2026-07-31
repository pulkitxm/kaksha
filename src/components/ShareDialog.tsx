"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "working" | "done" | "error";

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export function ShareDialog({ fileLabel }: { fileLabel: string }) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const blobRef = useRef<{ url: string; blob: Blob } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const query = searchParams.toString();
  const imageUrl = useMemo(
    () => `/api/share${query ? `?${query}` : ""}`,
    [query],
  );

  const loaded = loadedUrl === imageUrl;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function flash(kind: Status, text: string) {
    setStatus(kind);
    setMessage(text);
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 2200);
  }

  async function getBlob(): Promise<Blob> {
    const cached = blobRef.current;
    if (cached?.url === imageUrl) return cached.blob;
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Could not render the image");
    const blob = await response.blob();
    blobRef.current = { url: imageUrl, blob };
    return blob;
  }

  const fileName = `${fileLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "timetable"}.png`;

  async function download() {
    try {
      setStatus("working");
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      flash("done", "Downloaded");
    } catch {
      flash("error", "Download failed");
    }
  }

  async function copyImage() {
    try {
      setStatus("working");
      const blob = await getBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("done", "Image copied");
    } catch {
      flash("error", "Copy not supported here");
    }
  }

  async function share() {
    try {
      setStatus("working");
      const blob = await getBlob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileLabel });
        flash("done", "Shared");
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("done", "Copied, sharing unavailable");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("idle");
        return;
      }
      flash("error", "Share failed");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash("done", "Link copied");
    } catch {
      flash("error", "Copy failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        <Icon path="M11 5.5L8 2.5 5 5.5M8 2.5v8M3 10v2.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V10" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share timetable image"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="fade-in w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Share as image</h2>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {fileLabel} · reflects your current filters
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-panel-hover hover:text-fg"
              >
                <Icon path="M4 4l8 8M12 4l-8 8" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto bg-bg-subtle p-4">
              <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-line">
                {!loaded ? (
                  <div className="skeleton aspect-[1200/700] w-full" aria-hidden="true" />
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt="Timetable preview"
                  onLoad={() => setLoadedUrl(imageUrl)}
                  className={`w-full ${loaded ? "block" : "hidden"}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={share}
                disabled={status === "working"}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-fg px-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Icon path="M11 5.5L8 2.5 5 5.5M8 2.5v8M3 10v2.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V10" />
                Share
              </button>
              <button
                type="button"
                onClick={download}
                disabled={status === "working"}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50"
              >
                <Icon path="M5 7.5L8 10.5l3-3M8 10.5v-8M3 12v1.5h10V12" />
                Download
              </button>
              <button
                type="button"
                onClick={copyImage}
                disabled={status === "working"}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50"
              >
                <Icon path="M5.5 5.5V3.5A1 1 0 016.5 2.5h6a1 1 0 011 1v6a1 1 0 01-1 1h-2M3.5 5.5h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1v-6a1 1 0 011-1z" />
                Copy image
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Icon path="M6.5 9.5a2.5 2.5 0 003.5 0l2-2a2.5 2.5 0 00-3.5-3.5l-.7.7M9.5 6.5a2.5 2.5 0 00-3.5 0l-2 2a2.5 2.5 0 003.5 3.5l.7-.7" />
                Copy link
              </button>

              {message ? (
                <span
                  role="status"
                  className={`ml-auto text-xs ${
                    status === "error" ? "text-rose-500" : "text-fg-muted"
                  }`}
                >
                  {message}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
