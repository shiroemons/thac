import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import type * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

// ===== 型定義 =====

type ToastVariant = "success" | "error" | "info";

interface Toast {
	id: string;
	variant: ToastVariant;
	message: string;
}

interface ToastContextValue {
	showToast: (variant: ToastVariant, message: string) => void;
}

// ===== Context =====

const ToastContext = createContext<ToastContextValue | null>(null);

// ===== プロバイダー・コンポーネント =====

const TOAST_DURATION_MS = 3000;
const FADE_DURATION_MS = 300;

const variantConfig: Record<
	ToastVariant,
	{
		alertClass: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	success: { alertClass: "alert-success", icon: CheckCircle },
	error: { alertClass: "alert-error", icon: AlertCircle },
	info: { alertClass: "alert-info", icon: Info },
};

interface ToastItemProps {
	toast: Toast;
	onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
	const [isFadingOut, setIsFadingOut] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const dismiss = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
		setIsFadingOut(true);
		fadeTimerRef.current = setTimeout(() => {
			onRemove(toast.id);
		}, FADE_DURATION_MS);
	}, [toast.id, onRemove]);

	useEffect(() => {
		timerRef.current = setTimeout(() => {
			dismiss();
		}, TOAST_DURATION_MS);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
		};
	}, [dismiss]);

	const config = variantConfig[toast.variant];
	const Icon = config.icon;

	return (
		<div
			role="alert"
			aria-live={toast.variant === "error" ? "assertive" : "polite"}
			className={`alert ${config.alertClass} shadow-lg transition-opacity duration-300 ${isFadingOut ? "opacity-0" : "opacity-100"}`}
		>
			<Icon className="h-5 w-5 shrink-0" />
			<span className="flex-1">{toast.message}</span>
			<button
				type="button"
				onClick={dismiss}
				className="btn btn-ghost btn-sm btn-circle"
				aria-label="閉じる"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback((variant: ToastVariant, message: string) => {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		setToasts((prev) => [...prev, { id, variant, message }]);
	}, []);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<ToastContext value={{ showToast }}>
			{children}
			{toasts.length > 0 && (
				<div className="toast toast-top toast-center pointer-events-none z-50">
					<div className="pointer-events-auto flex flex-col gap-2">
						{toasts.map((t) => (
							<ToastItem key={t.id} toast={t} onRemove={removeToast} />
						))}
					</div>
				</div>
			)}
		</ToastContext>
	);
}

// ===== フック =====

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return ctx;
}

export type { ToastVariant };
