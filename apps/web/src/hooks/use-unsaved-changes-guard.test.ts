/**
 * useUnsavedChangesGuard のユニットテスト
 *
 * 未保存変更がある場合のダイアログ閉じる操作を保護するカスタムフックをテストする。
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// shouldBlockFn をキャプチャするための変数
let capturedShouldBlockFn: (() => boolean) | null = null;

// useBlocker をモックして shouldBlockFn をキャプチャ
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn((options: { shouldBlockFn: () => boolean }) => {
		capturedShouldBlockFn = options.shouldBlockFn;
	}),
}));

// モック後にインポート
const { useUnsavedChangesGuard } = await import("./use-unsaved-changes-guard");

// =============================================================================
// テスト
// =============================================================================

describe("useUnsavedChangesGuard", () => {
	describe("初期状態", () => {
		test("初期状態では showConfirmDialog が false であること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: false,
					isOpen: true,
				}),
			);

			expect(result.current.showConfirmDialog).toBe(false);
		});
	});

	describe("guardedOnOpenChange（開く操作）", () => {
		test("open=true の場合は onOpenChange(true) が呼ばれること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: false,
				}),
			);

			act(() => {
				result.current.guardedOnOpenChange(true);
			});

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(true);
		});
	});

	describe("guardedOnOpenChange（閉じる操作 - isDirty=false）", () => {
		test("isDirty=false の場合は確認なしで onOpenChange(false) が呼ばれること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: false,
					isOpen: true,
				}),
			);

			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(result.current.showConfirmDialog).toBe(false);
		});
	});

	describe("guardedOnOpenChange（閉じる操作 - isDirty=true）", () => {
		test("isDirty=true の場合は確認ダイアログが表示されること（showConfirmDialog=true）", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			expect(result.current.showConfirmDialog).toBe(true);
		});

		test("isDirty=true の場合は onOpenChange が呼ばれないこと", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			expect(onOpenChange).not.toHaveBeenCalled();
		});
	});

	describe("guardedOnOpenChange（閉じる操作 - allowClose=true）", () => {
		test("isDirty=true でも allowClose=true なら onOpenChange(false) が呼ばれること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
					allowClose: true,
				}),
			);

			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
			expect(result.current.showConfirmDialog).toBe(false);
		});
	});

	describe("closeConfirmDialog", () => {
		test("closeConfirmDialog を呼ぶと showConfirmDialog が false になること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			// まず確認ダイアログを表示
			act(() => {
				result.current.guardedOnOpenChange(false);
			});
			expect(result.current.showConfirmDialog).toBe(true);

			// closeConfirmDialog で閉じる
			act(() => {
				result.current.closeConfirmDialog();
			});

			expect(result.current.showConfirmDialog).toBe(false);
		});

		test("closeConfirmDialog を呼んでも onOpenChange は呼ばれないこと", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			// まず確認ダイアログを表示
			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			// closeConfirmDialog で閉じる
			act(() => {
				result.current.closeConfirmDialog();
			});

			// onOpenChange は呼ばれていないはず
			expect(onOpenChange).not.toHaveBeenCalled();
		});
	});

	describe("confirmDiscard", () => {
		test("confirmDiscard を呼ぶと showConfirmDialog が false になること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			// まず確認ダイアログを表示
			act(() => {
				result.current.guardedOnOpenChange(false);
			});
			expect(result.current.showConfirmDialog).toBe(true);

			// confirmDiscard で破棄
			act(() => {
				result.current.confirmDiscard();
			});

			expect(result.current.showConfirmDialog).toBe(false);
		});

		test("confirmDiscard を呼ぶと onOpenChange(false) が呼ばれること", () => {
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			// まず確認ダイアログを表示
			act(() => {
				result.current.guardedOnOpenChange(false);
			});

			// confirmDiscard で破棄
			act(() => {
				result.current.confirmDiscard();
			});

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("isOpen の影響", () => {
		test("isOpen=false の場合、isDirty=true でも保護が働かないこと（useBlockerのロジック確認用）", () => {
			// isOpen=false の場合、guardedOnOpenChange は呼ばれる場面がないが
			// useBlocker の shouldBlockFn が false を返すことを間接的に確認
			const onOpenChange = vi.fn(() => {});
			const { result } = renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: false,
				}),
			);

			// ダイアログが閉じている状態では、開く操作のみ行われる
			act(() => {
				result.current.guardedOnOpenChange(true);
			});

			expect(onOpenChange).toHaveBeenCalledWith(true);
			expect(result.current.showConfirmDialog).toBe(false);
		});
	});

	describe("useBlocker の shouldBlockFn", () => {
		// window.confirm のモック用
		let originalConfirm: typeof window.confirm;

		beforeEach(() => {
			originalConfirm = window.confirm;
			capturedShouldBlockFn = null;
		});

		afterEach(() => {
			window.confirm = originalConfirm;
		});

		test("isOpen=false の場合は false を返す（ブロックしない）", () => {
			const onOpenChange = vi.fn(() => {});
			renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: false,
				}),
			);

			expect(capturedShouldBlockFn).not.toBeNull();
			expect(capturedShouldBlockFn?.()).toBe(false);
		});

		test("isDirty=false の場合は false を返す（ブロックしない）", () => {
			const onOpenChange = vi.fn(() => {});
			renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: false,
					isOpen: true,
				}),
			);

			expect(capturedShouldBlockFn).not.toBeNull();
			expect(capturedShouldBlockFn?.()).toBe(false);
		});

		test("allowClose=true の場合は false を返す（ブロックしない）", () => {
			const onOpenChange = vi.fn(() => {});
			renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
					allowClose: true,
				}),
			);

			expect(capturedShouldBlockFn).not.toBeNull();
			expect(capturedShouldBlockFn?.()).toBe(false);
		});

		test("isDirty=true, isOpen=true で window.confirm が true なら false を返す（ブロックしない）", () => {
			window.confirm = vi.fn(() => true);

			const onOpenChange = vi.fn(() => {});
			renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			expect(capturedShouldBlockFn).not.toBeNull();
			expect(capturedShouldBlockFn?.()).toBe(false);
			expect(window.confirm).toHaveBeenCalledWith(
				"変更が保存されていません。このページを離れますか？",
			);
		});

		test("isDirty=true, isOpen=true で window.confirm が false なら true を返す（ブロックする）", () => {
			window.confirm = vi.fn(() => false);

			const onOpenChange = vi.fn(() => {});
			renderHook(() =>
				useUnsavedChangesGuard(onOpenChange, {
					isDirty: true,
					isOpen: true,
				}),
			);

			expect(capturedShouldBlockFn).not.toBeNull();
			expect(capturedShouldBlockFn?.()).toBe(true);
			expect(window.confirm).toHaveBeenCalledWith(
				"変更が保存されていません。このページを離れますか？",
			);
		});
	});
});
