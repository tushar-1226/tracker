import { ImageResponse } from "next/og";

const SIZES: Record<string, { px: number; pad: number; badge?: boolean }> = {
  "192": { px: 192, pad: 0 },
  "512": { px: 512, pad: 0 },
  maskable: { px: 512, pad: 0.18 }, // keeps the mark inside the safe zone
  badge: { px: 96, pad: 0, badge: true }, // Android status bar: white glyph on transparent
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

/** App icons drawn in the editorial style: bold "T." on black. */
export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const spec = SIZES[size];
  if (!spec) return new Response("Not found", { status: 404 });
  const { px, pad, badge } = spec;
  const font = px * (1 - pad * 2) * 0.62;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: badge ? "transparent" : "#0a0a0a",
          color: "#ffffff",
          fontSize: font,
          fontWeight: 800,
          letterSpacing: -font * 0.08,
        }}
      >
        T<span style={{ color: badge ? "#ffffff" : "#8f8f8f" }}>.</span>
      </div>
    ),
    { width: px, height: px },
  );
}
