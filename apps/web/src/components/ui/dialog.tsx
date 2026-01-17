import { XIcon } from "lucide-react";
import type * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

import { cn } from "@/lib/utils";

// Context to manage dialog state
interface DialogContextValue {
	open: boolean;
	setOpen: (open: boolean) => void;
	dialogRef: React.RefObject<HTMLDialogElement | null>;
	titleId: string;
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
	const titleId = useId();

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
		<DialogContext.Provider value={{ open, setOpen, dialogRef, titleId }}>
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
	const { open, setOpen, dialogRef, titleId } = useDialogContext();

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
			aria-labelledby={titleId}
			aria-modal="true"
			onClick={handleBackdropClick}
		>
			<div
				className={cn("modal-box flex max-h-[90vh] flex-col", className)}
				{...props}
			>
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
			className={cn("mb-4 shrink-0", className)}
			{...props}
		/>
	);
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-body"
			className={cn("flex-1 overflow-y-auto", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"modal-action sticky bottom-0 mt-4 border-base-300 border-t bg-base-100 pt-4",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h3">) {
	const { titleId } = useDialogContext();
	return (
		<h3
			id={titleId}
			data-slot="dialog-title"
			className={cn("font-bold text-lg", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
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
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
