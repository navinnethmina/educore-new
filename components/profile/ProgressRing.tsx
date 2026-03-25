export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 12,
  color = "#6366f1",
  label,
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
}) {
  const r = (size - strokeWidth * 2) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(Math.max(value, 0), 100)
  const dash = (pct / 100) * c
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeOpacity={0.15}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <span style={{ fontSize: size * 0.22, fontWeight: 700, lineHeight: 1, color: "inherit" }}>
            {value}
          </span>
          <span style={{ fontSize: size * 0.1, opacity: 0.45, color: "inherit" }}>/ 100</span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      )}
    </div>
  )
}
