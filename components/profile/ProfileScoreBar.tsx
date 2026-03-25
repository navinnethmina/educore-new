export function ProfileScoreBar({
  label,
  score,
  color,
  weight,
}: {
  label: string
  score: number
  color: string
  weight?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{label}</span>
          {weight && (
            <span className="text-muted-foreground">({weight})</span>
          )}
        </div>
        <span className="font-bold tabular-nums" style={{ color }}>{score}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
