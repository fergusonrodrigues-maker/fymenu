"use client";

import { useEffect, useRef } from "react";

export type PrintJobLite = {
  printerId: string;
  printerName?: string;
  html: string;
};

/**
 * Renders one or more print jobs into hidden iframes and triggers window.print()
 * sequentially. Mounts on demand: pass a jobs prop and a key that changes with
 * each new batch so the component re-runs.
 *
 * Browser autoplay policies require a user gesture before window.print() works
 * silently — we always print from inside a click handler, so this is fine.
 */
export default function ReceiptPrinter({
  jobs,
  onComplete,
}: {
  jobs: PrintJobLite[] | null;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ranRef = useRef<string | null>(null);

  useEffect(() => {
    if (!jobs || jobs.length === 0) return;
    const batchKey = jobs.map((j) => j.printerId).join("|") + ":" + jobs.length;
    if (ranRef.current === batchKey) return;
    ranRef.current = batchKey;

    let cancelled = false;
    let done = 0;

    async function runOne(job: PrintJobLite, idx: number) {
      if (cancelled) return;
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.title = `print-${idx}`;
      containerRef.current?.appendChild(iframe);

      const cleanup = () => {
        try { iframe.remove(); } catch { /* */ }
      };

      try {
        const doc = iframe.contentDocument!;
        doc.open();
        doc.write(job.html);
        doc.close();

        // Wait for images (logo) to settle before printing.
        await new Promise<void>((resolve) => {
          const win = iframe.contentWindow!;
          const start = () => {
            // small delay to let layout settle
            setTimeout(() => resolve(), 60);
          };
          if (win.document.readyState === "complete") start();
          else win.addEventListener("load", start, { once: true });
        });

        const win = iframe.contentWindow!;
        win.focus();
        // print() is synchronous in most browsers — returns once the user
        // accepts/cancels the dialog
        win.print();
      } catch (err) {
        console.error("ReceiptPrinter: print failed:", err);
      } finally {
        // Give the browser a tick before removing the iframe so the print
        // queue can grab the document.
        setTimeout(cleanup, 800);
        done++;
        if (done === jobs!.length && !cancelled) onComplete?.();
      }
    }

    (async () => {
      for (let i = 0; i < jobs.length; i++) {
        if (cancelled) break;
        await runOne(jobs[i], i);
      }
    })();

    return () => { cancelled = true; };
  }, [jobs, onComplete]);

  return <div ref={containerRef} aria-hidden style={{ position: "fixed", right: 0, bottom: 0, width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} />;
}
