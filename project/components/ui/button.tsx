"use client";

import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import {
	Button as ButtonPrimitive,
	type ButtonProps as ButtonPrimitiveProps,
	Link as LinkPrimitive,
	type LinkProps as LinkPrimitiveProps,
} from "react-aria-components";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

// Renders an accessible interactive button element with customizable variants and sizes.
function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: Omit<ButtonPrimitiveProps, "className"> &
	React.RefAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants> & {
		className?: string;
	}) {
	return (
		<ButtonPrimitive
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

// Renders an accessible link styled as a button with matching variant and sizing options.
function LinkButton({
	className,
	variant = "default",
	size = "default",
	...props
}: Omit<LinkPrimitiveProps, "className"> &
	VariantProps<typeof buttonVariants> & {
		className?: string;
	}) {
	return (
		<LinkPrimitive
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants, LinkButton };
