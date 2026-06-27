import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-[4px] border-2 px-2 py-0.5 text-[10px] font-[family-name:var(--font-mono)] font-medium uppercase tracking-wider transition-all duration-100 focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-[#C94A00] bg-[rgba(201,74,0,0.12)] text-[#C94A00]",
        secondary:
          "border-[#0A6B52] bg-[rgba(10,107,82,0.12)] text-[#0A6B52]",
        destructive:
          "border-[#991111] bg-[rgba(153,17,17,0.12)] text-[#991111]",
        outline:
          "border-[rgba(12,12,12,0.40)] bg-[rgba(12,12,12,0.05)] text-[#555555]",
        warning:
          "border-[#D4A800] bg-[rgba(212,168,0,0.12)] text-[#8a6800]",
        teal:
          "border-[#0D9970] bg-[rgba(13,153,112,0.12)] text-[#0A6B52]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
