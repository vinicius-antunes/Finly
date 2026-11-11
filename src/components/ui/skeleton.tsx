// shadcn/ui, MIT (copyright 2023 shadcn).
// Finly uses dedicated Radix modules and semantic Graphite tokens; docs/licenses/shadcn-ui.txt
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
