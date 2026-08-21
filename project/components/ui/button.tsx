"use client"

import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
        outline:
          "border-border/90 bg-card text-foreground font-medium shadow-2xs hover:bg-brand_teal-500/10 hover:border-brand_teal-500/50 hover:text-brand_teal-700 dark:hover:bg-brand_mint-500/15 dark:hover:text-brand_mint-300 dark:hover:border-brand_mint-500/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground font-medium border border-border/60 shadow-2xs hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-brand_teal-500/10 hover:text-brand_teal-700 dark:hover:bg-brand_mint-500/15 dark:hover:text-brand_mint-300 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-white font-semibold shadow-xs hover:bg-destructive/90 hover:shadow-md dark:bg-destructive/90 dark:text-destructive-foreground",
        link: "text-brand_teal-600 dark:text-brand_mint-400 font-semibold underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// Renders an accessible interactive button element with customizable variants and sizes.
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<ButtonPrimitiveProps, "className"> &
  React.RefAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// Renders an accessible link styled as a button with matching variant and sizing options.
function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: Omit<LinkPrimitiveProps, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, LinkButton, buttonVariants }
