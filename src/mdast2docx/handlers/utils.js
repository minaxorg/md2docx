// 解析宽度字符串为 twips（复用 sanitize-html 的逻辑）
export function parseWidthToTwips(widthStr, totalTwips) {
  if (!widthStr) return null;
  const s = String(widthStr).trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const pct = Number.parseFloat(s);
    if (Number.isFinite(pct)) return (pct / 100) * totalTwips;
    return null;
  }
  if (s.endsWith("px")) {
    const px = Number.parseFloat(s);
    if (Number.isFinite(px)) return px * 15; // 96dpi 近似：1px ≈ 15 twips
    return null;
  }
  if (s.endsWith("cm")) {
    const cm = Number.parseFloat(s);
    if (Number.isFinite(cm)) return cm * 566.93;
    return null;
  }
  if (s.endsWith("in")) {
    const inch = Number.parseFloat(s);
    if (Number.isFinite(inch)) return inch * 1440;
    return null;
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n * 15 : null;
}