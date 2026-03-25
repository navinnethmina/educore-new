import Link from "next/link"

const TYPE_ICON: Record<string, string> = {
  academic: "📚",
  sports: "🏃",
  society: "👥",
  materials: "📁",
  mentor: "🎓",
}

export function SuggestionCard({
  type,
  text,
  href,
  linkLabel,
}: {
  type: string
  text: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border">
      <span className="text-xl shrink-0 leading-none mt-0.5">{TYPE_ICON[type] ?? "💡"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">{text}</p>
        <Link
          href={href}
          className="text-xs text-primary hover:underline mt-1.5 inline-block font-medium"
        >
          {linkLabel}
        </Link>
      </div>
    </div>
  )
}
