import { cn } from "@/lib/utils"

interface ScoreIndicatorProps {
  score: number
  size?: "sm" | "lg"
}

export function ScoreIndicator({ score, size = "sm" }: ScoreIndicatorProps) {
  const getScoreInfo = (s: number) => {
    if (s > 75) {
      return {
        color: "bg-green-500",
        label: "Hot",
      }
    }
    if (s > 40) {
      return {
        color: "bg-yellow-500",
        label: "Warm",
      }
    }
    return {
      color: "bg-red-500",
      label: "Cold",
    }
  }

  const { color, label } = getScoreInfo(score)

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            "flex h-24 w-24 items-center justify-center rounded-full text-white",
            color
          )}
        >
          <span className="text-3xl font-bold">{score}</span>
        </div>
        <span className="font-semibold text-lg">{label} Lead</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2.5 w-2.5 rounded-full", color)}></div>
      <span className="font-medium">{score}</span>
    </div>
  )
}
