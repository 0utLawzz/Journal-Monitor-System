import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-none border-2 border-[#0C0C0C] bg-[#FAF6EE] px-3 py-1 text-sm text-[#0C0C0C] transition-all duration-100 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[rgba(12,12,12,0.35)] focus-visible:outline-none focus-visible:border-[#C94A00] focus-visible:ring-0 focus-visible:[box-shadow:0_0_0_2px_rgba(201,74,0,0.20)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
