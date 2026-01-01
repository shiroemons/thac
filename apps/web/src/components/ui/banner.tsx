import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

type BannerVariant = "info" | "warning" | "error" | "success";

interface BannerProps {
	variant?: BannerVariant;
	children: React.ReactNode;
	onDismiss?: () => void;
	dismissible?: boolean;
	className?: string;
}

const variantConfig: Record<
	BannerVariant,
	{
		alertClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	info: { alertClass: "alert-info", icon: Info },
	warning: { alertClass: "alert-warning", icon: AlertTriangle },
	error: { alertClass: "alert-error", icon: AlertCircle },
	success: { alertClass: "alert-success", icon: CheckCircle },
};

function Banner({
	variant = "info",
	children,
	onDismiss,
	dismissible = true,
	className,
}: BannerProps) {
	const config = variantConfig[variant];
	const Icon = config.icon;

	return (
		<div
			role="alert"
			aria-live={variant === "error" ? "assertive" : "polite"}
			className={cn("alert", config.alertClass, className)}
		>
			<Icon className="h-5 w-5 shrink-0" />
			<div className="flex-1">{children}</div>
			{dismissible && onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					className="btn btn-ghost btn-sm btn-circle"
					aria-label="閉じる"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
}

export { Banner };
export type { BannerProps, BannerVariant };
