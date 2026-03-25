const W = 500
const H = 180
const PAD = { top: 24, right: 24, bottom: 44, left: 44 }
const PW = W - PAD.left - PAD.right
const PH = H - PAD.top - PAD.bottom
const MAX_GPA = 4.0

export interface GpaPoint {
  semesterNum: number
  academicYear: string
  gpa: number
}

export function GpaLineChart({ data }: { data: GpaPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No semester data yet.
      </div>
    )
  }

  const xs = data.map((_, i) =>
    data.length === 1
      ? PAD.left + PW / 2
      : PAD.left + (i / (data.length - 1)) * PW
  )
  const ys = data.map((d) => PAD.top + PH - (d.gpa / MAX_GPA) * PH)
  const polylinePoints = xs.map((x, i) => `${x},${ys[i]}`).join(" ")

  // Fill area under line
  const areaPoints =
    `${xs[0]},${PAD.top + PH} ` +
    xs.map((x, i) => `${x},${ys[i]}`).join(" ") +
    ` ${xs[xs.length - 1]},${PAD.top + PH}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="GPA trend chart">
      {/* Y-axis grid + labels */}
      {[0, 1, 2, 3, 4].map((v) => {
        const y = PAD.top + PH - (v / MAX_GPA) * PH
        return (
          <g key={v}>
            <line
              x1={PAD.left} y1={y}
              x2={W - PAD.right} y2={y}
              stroke="currentColor" strokeOpacity={0.08}
            />
            <text
              x={PAD.left - 8} y={y}
              textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="currentColor" opacity={0.4}
            >
              {v.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      <polygon points={areaPoints} fill="hsl(var(--primary))" opacity={0.06} />

      {/* Line */}
      {data.length > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Points, values, labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={xs[i]} cy={ys[i]}
            r={5}
            fill="hsl(var(--primary))"
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={xs[i]} y={ys[i] - 12}
            textAnchor="middle"
            fontSize={11} fontWeight={600}
            fill="hsl(var(--primary))"
          >
            {d.gpa.toFixed(2)}
          </text>
          <text
            x={xs[i]} y={H - PAD.bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor" opacity={0.5}
          >
            Sem {d.semesterNum}
          </text>
        </g>
      ))}
    </svg>
  )
}
