import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useMyMeta } from "@/lib/use-profile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emojify")({
  head: () => ({ meta: [{ title: "Emojify — ReelFlex" }] }),
  component: Emojify,
});

// 16 emojis from dark → light
const RAMP = ["⬛","🟫","🟪","🟦","🟥","🟧","🟩","🟨","🌑","🌘","🌗","🌖","🌕","⭐","🌟","✨"];

function Emojify() {
  const { data: me, isLoading } = useMyMeta();
  const navigate = useNavigate();
  const [src, setSrc] = useState<string | null>(null);
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [cols, setCols] = useState(32);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isLoading && me && !me.super_reelflex) {
      toast.error("Emojify is a Super feature");
      navigate({ to: "/feed", replace: true });
    }
  }, [me, isLoading, navigate]);

  function onFile(f: File | null) {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setSrc(url);
  }

  function convert() {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = canvasRef.current!;
      const ctx = c.getContext("2d")!;
      const rows = Math.round((img.height / img.width) * cols);
      c.width = cols;
      c.height = rows;
      ctx.drawImage(img, 0, 0, cols, rows);
      const px = ctx.getImageData(0, 0, cols, rows).data;
      const out: string[][] = [];
      for (let y = 0; y < rows; y++) {
        const row: string[] = [];
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const idx = Math.min(RAMP.length - 1, Math.floor((lum / 255) * RAMP.length));
          row.push(RAMP[idx]);
        }
        out.push(row);
      }
      setGrid(out);
    };
    img.src = src;
  }

  function copyText() {
    if (!grid) return;
    navigator.clipboard.writeText(grid.map((r) => r.join("")).join("\n"));
    toast.success("Copied!");
  }

  return (
    <AppShell>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: "#ffd34d" }} />
          <h1 className="text-2xl font-bold">Photo → Emoji</h1>
        </div>
        <p className="text-sm text-muted-foreground">Exclusive Super feature. Turn any picture into emojis.</p>

        <label className="block cursor-pointer rounded-xl border border-dashed border-border bg-input/30 px-4 py-6 text-center text-sm">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          {src ? "Change image" : "Choose an image"}
        </label>

        {src && (
          <>
            <img src={src} alt="src" className="max-h-48 rounded-xl object-contain" />
            <div className="flex items-center gap-2 text-sm">
              <label>Density</label>
              <input type="range" min={16} max={64} value={cols} onChange={(e) => setCols(+e.target.value)} />
              <span className="w-8 text-right text-xs text-muted-foreground">{cols}</span>
              <button
                onClick={convert}
                className="ml-auto rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: "linear-gradient(135deg,#ffd34d,#b8860b)", color: "#fff" }}
              >
                Emojify
              </button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {grid && (
          <div className="space-y-2">
            <div
              className="overflow-x-auto rounded-xl border border-border bg-card p-2 font-mono leading-none"
              style={{ fontSize: 10 }}
            >
              {grid.map((r, i) => (
                <div key={i} style={{ whiteSpace: "pre" }}>
                  {r.join("")}
                </div>
              ))}
            </div>
            <button onClick={copyText} className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm">
              <Download className="h-4 w-4" /> Copy as text
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
