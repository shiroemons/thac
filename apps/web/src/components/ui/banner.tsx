import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type BannerVariant = "info" | "warning" | "error" | "success";

interface BannerProps {
	variant?: BannerVariant;
	children: React.ReactNode;
	onDismiss?: () => void;
	dismissible?: boolean;
	className?: string;
	/** 自動非表示までの時間（ミリ秒）。0または未指定で自動非表示なし */
	autoHideDuration?: number;
	/** 自動非表示時のコールバック */
	onAutoHide?: () => void;
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
	autoHideDuration,
	onAutoHide,
}: BannerProps) {
	const config = variantConfig[variant];
	const Icon = config.icon;
	const [isVisible, setIsVisible] = useState(true);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// タイマーをクリア
	const clearTimers = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (fadeTimerRef.current) {
			clearTimeout(fadeTimerRef.current);
			fadeTimerRef.current = null;
		}
	}, []);

	// 自動非表示タイマー
	useEffect(() => {
		if (!autoHideDuration || autoHideDuration <= 0) {
			return;
		}

		// フェードアウト開始までの時間（トランジション時間を考慮して300ms早く開始）
		const fadeStartTime = Math.max(autoHideDuration - 300, 0);

		timerRef.current = setTimeout(() => {
			setIsFadingOut(true);
			// フェードアウト完了後に非表示
			fadeTimerRef.current = setTimeout(() => {
				setIsVisible(false);
				onAutoHide?.();
			}, 300);
		}, fadeStartTime);

		return () => {
			clearTimers();
		};
	}, [autoHideDuration, onAutoHide, clearTimers]);

	// 手動で閉じた場合
	const handleDismiss = () => {
		clearTimers();
		setIsFadingOut(true);
		fadeTimerRef.current = setTimeout(() => {
			setIsVisible(false);
			onDismiss?.();
		}, 300);
	};

	if (!isVisible) {
		return null;
	}

	return (
		<div
			role="alert"
			aria-live={variant === "error" ? "assertive" : "polite"}
			className={cn(
				"alert transition-opacity duration-300",
				config.alertClass,
				isFadingOut && "opacity-0",
				className,
			)}
		>
			<Icon className="h-5 w-5 shrink-0" />
			<div className="flex-1">{children}</div>
			{dismissible && onDismiss && (
				<button
					type="button"
					onClick={handleDismiss}
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
