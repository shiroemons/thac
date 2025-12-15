"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

import { cn } from "@/lib/utils";

// Context for sharing state between DropdownMenu components
interface DropdownMenuContextValue {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	close: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(
	null,
);

function useDropdownMenuContext() {
	const context = useContext(DropdownMenuContext);
	if (!context) {
		throw new Error(
			"DropdownMenu components must be used within a DropdownMenu",
		);
	}
	return context;
}

interface DropdownMenuProps {
	children: ReactNode;
}

function DropdownMenu({ children }: DropdownMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const close = useCallback(() => setIsOpen(false), []);

	// Close on outside click
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		// Close on escape key
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	return (
		<DropdownMenuContext.Provider value={{ isOpen, setIsOpen, close }}>
			<div
				ref={containerRef}
				data-slot="dropdown-menu"
				className="relative inline-block"
			>
				{children}
			</div>
		</DropdownMenuContext.Provider>
	);
}

interface DropdownMenuTriggerProps {
	children: ReactNode;
	className?: string;
	asChild?: boolean;
}

function DropdownMenuTrigger({
	children,
	className,
	asChild = false,
}: DropdownMenuTriggerProps) {
	const { isOpen, setIsOpen } = useDropdownMenuContext();

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsOpen(!isOpen);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setIsOpen(!isOpen);
		}
	};

	// If asChild is true, we render just the children with click handler
	// Otherwise, wrap in a div
	if (asChild) {
		return (
			<div
				data-slot="dropdown-menu-trigger"
				role="button"
				tabIndex={0}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={cn("cursor-pointer", className)}
			>
				{children}
			</div>
		);
	}

	return (
		<div
			data-slot="dropdown-menu-trigger"
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={cn("cursor-pointer", className)}
		>
			{children}
		</div>
	);
}

interface DropdownMenuContentProps extends React.ComponentProps<"ul"> {
	align?: "start" | "end";
}

function DropdownMenuContent({
	className,
	align = "end",
	children,
	...props
}: DropdownMenuContentProps) {
	const { isOpen } = useDropdownMenuContext();

	if (!isOpen) return null;

	return (
		<ul
			data-slot="dropdown-menu-content"
			role="menu"
			className={cn(
				"absolute z-50 mt-1 w-52 rounded-box bg-base-100 p-2 shadow-lg",
				align === "end" ? "right-0" : "left-0",
				className,
			)}
			{...props}
		>
			{children}
		</ul>
	);
}

interface DropdownMenuItemProps extends React.ComponentProps<"li"> {
	inset?: boolean;
}

function DropdownMenuItem({
	className,
	inset,
	onClick,
	children,
	...props
}: DropdownMenuItemProps) {
	const { close } = useDropdownMenuContext();

	const handleClick = (e: React.MouseEvent<HTMLLIElement>) => {
		onClick?.(e);
		close();
	};

	return (
		<li
			data-slot="dropdown-menu-item"
			data-inset={inset}
			role="menuitem"
			tabIndex={0}
			onClick={handleClick}
			className={cn(
				"flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm hover:bg-base-200 focus:bg-base-200 focus:outline-none",
				inset && "pl-8",
				className,
			)}
			{...props}
		>
			{children}
		</li>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<"li"> & { inset?: boolean }) {
	return (
		<li
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				"menu-title px-2 py-1.5 font-medium text-sm",
				inset && "pl-8",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="dropdown-menu-separator"
			className={cn("my-1 border-base-300 border-b", className)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
};
