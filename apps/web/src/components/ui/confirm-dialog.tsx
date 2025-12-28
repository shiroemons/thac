import { AlertTriangle } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
	variant?: "danger" | "warning" | "default";
}

function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "確認",
	cancelLabel = "キャンセル",
	onConfirm,
	onCancel,
	isLoading = false,
	variant = "default",
}: ConfirmDialogProps) {
	const handleCancel = () => {
		onCancel?.();
		onOpenChange(false);
	};

	const handleConfirm = () => {
		onConfirm();
	};

	const confirmButtonVariant = variant === "danger" ? "destructive" : "primary";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						{variant === "danger" && (
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
								<AlertTriangle className="h-5 w-5 text-error" />
							</div>
						)}
						{variant === "warning" && (
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
								<AlertTriangle className="h-5 w-5 text-warning" />
							</div>
						)}
						<DialogTitle>{title}</DialogTitle>
					</div>
				</DialogHeader>
				<DialogDescription className="py-2">{description}</DialogDescription>
				<DialogFooter>
					<Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
						{cancelLabel}
					</Button>
					<Button
						variant={confirmButtonVariant}
						onClick={handleConfirm}
						disabled={isLoading}
					>
						{isLoading ? "処理中..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { ConfirmDialog };
export type { ConfirmDialogProps };
