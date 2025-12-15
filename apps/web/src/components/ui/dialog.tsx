import { XIcon } from "lucide-react";
import type * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

import { cn } from "@/lib/utils";

// Context to manage dialog state
interface DialogContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
	dialogRef: React.RefObject<HTMLDialogElement | null>;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

function useDialogContext() {
	const context = useContext(DialogContext);
	if (!context) {
		throw new Error("Dialog components must be used within a Dialog");
	}
	return context;
}

interface DialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);

	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;

	const setOpen = useCallback(
		(newOpen: boolean) => {
			if (!isControlled) {
				setInternalOpen(newOpen);
			}
			onOpenChange?.(newOpen);
		},
		[isControlled, onOpenChange],
	);

	return (
		<DialogContext.Provider value={{ open, setOpen, dialogRef }}>
			{children}
		</DialogContext.Provider>
	);
}

interface DialogTriggerProps extends React.ComponentProps<"button"> {
	asChild?: boolean;
}

function DialogTrigger({
	children,
	asChild = false,
	...props
}: DialogTriggerProps) {
	const { setOpen } = useDialogContext();

	const handleClick = () => {
		setOpen(true);
	};

	if (asChild) {
		return (
			<span role="button" tabIndex={0} onClick={handleClick}>
				{children}
			</span>
		);
	}

	return (
		<button
			type="button"
			data-slot="dialog-trigger"
			onClick={handleClick}
			{...props}
		>
			{children}
		</button>
	);
}

interface DialogContentProps extends React.ComponentProps<"div"> {
	showCloseButton?: boolean;
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: DialogContentProps) {
	const { open, setOpen, dialogRef } = useDialogContext();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open) {
			dialog.showModal();
		} else {
			dialog.close();
		}
	}, [open, dialogRef]);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => setOpen(false);
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [setOpen, dialogRef]);

	const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
		if (e.target === dialogRef.current) {
			setOpen(false);
		}
	};

	return (
		<dialog
			ref={dialogRef}
			data-slot="dialog-content"
			className="modal"
			onClick={handleBackdropClick}
		>
			<div className={cn("modal-box", className)} {...props}>
				{children}
				{showCloseButton && (
					<button
						type="button"
						className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
						onClick={() => setOpen(false)}
					>
						<XIcon className="size-4" />
						<span className="sr-only">閉じる</span>
					</button>
				)}
			</div>
			<form method="dialog" className="modal-backdrop">
				<button type="submit">閉じる</button>
			</form>
		</dialog>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("mb-4", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("modal-action mt-4", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h3">) {
	return (
		<h3
			data-slot="dialog-title"
			className={cn("font-bold text-lg", className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="dialog-description"
			className={cn("text-base-content/70 text-sm", className)}
			{...props}
		/>
	);
}

function DialogClose({ children, ...props }: React.ComponentProps<"button">) {
	const { setOpen } = useDialogContext();

	return (
		<button
			type="button"
			data-slot="dialog-close"
			onClick={() => setOpen(false)}
			{...props}
		>
			{children}
		</button>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
