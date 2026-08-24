"use client";

import type * as React from "react";
import {
	Cell as CellPrimitive,
	type CellProps,
	Column as ColumnPrimitive,
	type ColumnProps,
	Row as RowPrimitive,
	type RowProps,
	TableBody as TableBodyPrimitive,
	type TableBodyProps,
	TableFooter as TableFooterPrimitive,
	type TableFooterProps,
	TableHeader as TableHeaderPrimitive,
	type TableHeaderProps,
	Table as TablePrimitive,
	type TableProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

interface TableComponentProps extends TableProps {
	containerClassName?: string;
}

function Table({
	className,
	containerClassName,
	...props
}: TableComponentProps) {
	return (
		<div
			data-slot="table-container"
			className={cn(
				"relative w-full overflow-auto bg-muted/20 dark:bg-[#141417]",
				containerClassName,
			)}
		>
			<TablePrimitive
				data-slot="table"
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
}

function TableHeader<T>({ className, ...props }: TableHeaderProps<T>) {
	return (
		<TableHeaderPrimitive
			data-slot="table-header"
			className={cn(
				"sticky top-0 z-10 bg-muted/90 dark:bg-[#222228] backdrop-blur-xs [&_tr]:border-b border-border",
				className,
			)}
			{...props}
		/>
	);
}

function TableBody<T>({ className, ...props }: TableBodyProps<T>) {
	return (
		<TableBodyPrimitive
			data-slot="table-body"
			className={cn(
				"bg-muted/15 dark:bg-[#141417] data-empty:h-24 data-empty:text-center [&_tr:last-child]:border-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableFooter<T>({ className, ...props }: TableFooterProps<T>) {
	return (
		<TableFooterPrimitive
			data-slot="table-footer"
			className={cn(
				"border-t bg-muted/60 dark:bg-[#222228] font-medium [&>tr]:last:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableRow<T>({ className, ...props }: RowProps<T>) {
	return (
		<RowPrimitive
			data-slot="table-row"
			className={cn(
				"border-b border-border/50 transition-colors hover:bg-muted/50 dark:hover:bg-[#1E1E24] has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted data-selected:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

function TableHead({ className, ...props }: ColumnProps) {
	return (
		<ColumnPrimitive
			data-slot="table-head"
			className={cn(
				"sticky top-0 z-10 bg-muted/90 dark:bg-[#222228] backdrop-blur-xs h-10 px-3 text-left align-middle font-semibold whitespace-nowrap text-foreground/90 dark:text-gray-300 border-b border-border [&:has([data-slot=checkbox])]:pr-0 [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: CellProps) {
	return (
		<CellPrimitive
			data-slot="table-cell"
			className={cn(
				"p-3 align-middle whitespace-nowrap [&:has([data-slot=checkbox])]:pr-0 [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<"figcaption">) {
	return (
		<figcaption
			data-slot="table-caption"
			className={cn(
				"mt-4 text-center text-sm text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
};
