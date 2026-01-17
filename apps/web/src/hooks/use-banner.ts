import { useCallback, useEffect, useRef, useState } from "react";
import type { BannerVariant } from "@/components/ui/banner";

interface BannerState {
	message: string;
	variant: BannerVariant;
	visible: boolean;
}

interface UseBannerOptions {
	/** 自動非表示までの時間（ミリ秒）。デフォルト: 5000ms */
	autoHideDuration?: number;
}

const DEFAULT_AUTO_HIDE_DURATION = 5000;

/**
 * バナー表示を管理するカスタムフック
 * @param options オプション設定
 * @returns バナー状態と制御関数
 */
export function useBanner(options: UseBannerOptions = {}) {
	const { autoHideDuration = DEFAULT_AUTO_HIDE_DURATION } = options;

	const [bannerState, setBannerState] = useState<BannerState>({
		message: "",
		variant: "info",
		visible: false,
	});

	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const dismiss = useCallback(() => {
		clearTimer();
		setBannerState((prev) => ({ ...prev, visible: false }));
	}, [clearTimer]);

	const show = useCallback(
		(message: string, variant: BannerVariant = "info") => {
			clearTimer();
			setBannerState({ message, variant, visible: true });

			if (autoHideDuration > 0) {
				timerRef.current = setTimeout(() => {
					setBannerState((prev) => ({ ...prev, visible: false }));
				}, autoHideDuration);
			}
		},
		[autoHideDuration, clearTimer],
	);

	// クリーンアップ
	useEffect(() => {
		return () => {
			clearTimer();
		};
	}, [clearTimer]);

	return { bannerState, show, dismiss };
}

export type { BannerState, UseBannerOptions };
