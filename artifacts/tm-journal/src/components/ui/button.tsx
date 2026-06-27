import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium transition-all duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wide cursor-pointer border-2 border-[#0C0C0C]",
  {
    variants: {
      variant: {
        default:
          "bg-[#C94A00] text-[#FAF6EE] nb-shadow nb-lift font-[family-name:var(--font-mono)]",
        destructive:
          "bg-[#991111] text-[#FAF6EE] nb-shadow nb-lift font-[family-name:var(--font-mono)]",
        outline:
          "bg-[#FAF6EE] text-[#0C0C0C] nb-shadow-sm nb-lift-sm font-[family-name:var(--font-mono)]",
        secondary:
          "bg-[#E8DFC7] text-[#0C0C0C] nb-shadow-sm nb-lift-sm font-[family-name:var(--font-mono)]",
        ghost: "border-transparent bg-transparent text-[#0C0C0C] hover:bg-[#E8DFC7]",
        link: "border-transparent text-[#C94A00] underline-offset-4 hover:underline",
        teal:
          "bg-[#0D9970] text-white nb-shadow nb-lift font-[family-name:var(--font-mono)]",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-[6px]",
        sm: "h-8 px-3 rounded-[6px] text-xs",
        lg: "h-10 px-8 rounded-[6px]",
        icon: "h-9 w-9 rounded-[6px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
