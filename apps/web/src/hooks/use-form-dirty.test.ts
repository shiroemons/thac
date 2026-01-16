/**
 * useFormDirty フックのユニットテスト
 *
 * フォームの初期値と現在値を比較してisDirtyを計算するフックの動作を検証する。
 */

import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useFormDirty } from "./use-form-dirty";

// =============================================================================
// テストデータ型（Record<string, unknown> を満たすように index signature を追加）
// =============================================================================

interface TestFormData extends Record<string, unknown> {
	name: string;
	email: string | null;
	age?: number;
}

interface ComplexFormData extends Record<string, unknown> {
	name: string;
	count: number;
	active: boolean;
	tags: string[];
	metadata: { key: string } | null;
}

// =============================================================================
// テスト
// =============================================================================

describe("useFormDirty", () => {
	describe("初期状態", () => {
		test("初期状態では isDirty が false であること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			expect(result.current.isDirty).toBe(false);
		});

		test("setInitialState を呼ばずに checkDirty を呼ぶと false を返すこと", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Test",
					email: "test@example.com",
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});
	});

	describe("setInitialState", () => {
		test("初期状態を設定できること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: "test@example.com",
				});
			});

			// setInitialState後にcheckDirtyで同じ値を渡すとfalseになる
			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Test",
					email: "test@example.com",
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});

		test("setInitialState 後は isDirty が false になること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			// 先に変更状態にする
			act(() => {
				result.current.setInitialState({ name: "Initial", email: null });
			});
			act(() => {
				result.current.checkDirty({ name: "Changed", email: null });
			});
			expect(result.current.isDirty).toBe(true);

			// setInitialStateを呼ぶとisDirtyがfalseになる
			act(() => {
				result.current.setInitialState({ name: "New Initial", email: null });
			});
			expect(result.current.isDirty).toBe(false);
		});
	});

	describe("checkDirty", () => {
		test("同じ値の場合は isDirty が false になること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: "test@example.com",
				});
			});

			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Test",
					email: "test@example.com",
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});

		test("異なる値の場合は isDirty が true になること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: "test@example.com",
				});
			});

			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Changed",
					email: "test@example.com",
				});
			});

			expect(checkResult).toBe(true);
			expect(result.current.isDirty).toBe(true);
		});

		test("空文字と null は同等として扱われること（isDirty = false）", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			// 初期状態でnullを設定
			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: null,
				});
			});

			// 空文字でチェック
			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Test",
					email: "",
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});

		test("空文字から null への変更も同等として扱われること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			// 初期状態で空文字を設定
			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: "",
				});
			});

			// nullでチェック
			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Test",
					email: null,
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});

		test("ネストされていないオブジェクトの比較が正しく動作すること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: "test@example.com",
					age: 25,
				});
			});

			// 同じ値
			let checkResult1 = false;
			act(() => {
				checkResult1 = result.current.checkDirty({
					name: "Test",
					email: "test@example.com",
					age: 25,
				});
			});
			expect(checkResult1).toBe(false);

			// nameが異なる
			let checkResult2 = false;
			act(() => {
				checkResult2 = result.current.checkDirty({
					name: "Different",
					email: "test@example.com",
					age: 25,
				});
			});
			expect(checkResult2).toBe(true);

			// ageが異なる
			let checkResult3 = false;
			act(() => {
				checkResult3 = result.current.checkDirty({
					name: "Test",
					email: "test@example.com",
					age: 30,
				});
			});
			expect(checkResult3).toBe(true);
		});

		test("戻り値が isDirty と一致すること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					email: null,
				});
			});

			// 変更なし
			let checkResult1 = false;
			act(() => {
				checkResult1 = result.current.checkDirty({
					name: "Test",
					email: null,
				});
			});
			expect(checkResult1).toBe(result.current.isDirty);

			// 変更あり
			let checkResult2 = false;
			act(() => {
				checkResult2 = result.current.checkDirty({
					name: "Changed",
					email: null,
				});
			});
			expect(checkResult2).toBe(result.current.isDirty);
		});
	});

	describe("reset", () => {
		test("reset を呼ぶと isDirty が false になること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			// 変更状態にする
			act(() => {
				result.current.setInitialState({ name: "Initial", email: null });
			});
			act(() => {
				result.current.checkDirty({ name: "Changed", email: null });
			});
			expect(result.current.isDirty).toBe(true);

			// resetを呼ぶ
			act(() => {
				result.current.reset();
			});

			expect(result.current.isDirty).toBe(false);
		});

		test("reset 後も再度 checkDirty で isDirty を更新できること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({ name: "Initial", email: null });
			});
			act(() => {
				result.current.checkDirty({ name: "Changed", email: null });
			});
			act(() => {
				result.current.reset();
			});
			expect(result.current.isDirty).toBe(false);

			// 再度checkDirtyを呼ぶ
			act(() => {
				result.current.checkDirty({ name: "Changed Again", email: null });
			});
			expect(result.current.isDirty).toBe(true);
		});
	});

	describe("エッジケース", () => {
		test("初期状態が設定されていない場合、checkDirty は false を返すこと", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			let checkResult = false;
			act(() => {
				checkResult = result.current.checkDirty({
					name: "Any Value",
					email: "any@example.com",
				});
			});

			expect(checkResult).toBe(false);
			expect(result.current.isDirty).toBe(false);
		});

		test("数値の比較が正しく動作すること", () => {
			const { result } = renderHook(() => useFormDirty<ComplexFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					count: 10,
					active: true,
					tags: [],
					metadata: null,
				});
			});

			// 同じ数値
			let checkResult1 = false;
			act(() => {
				checkResult1 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: true,
					tags: [],
					metadata: null,
				});
			});
			expect(checkResult1).toBe(false);

			// 異なる数値
			let checkResult2 = false;
			act(() => {
				checkResult2 = result.current.checkDirty({
					name: "Test",
					count: 20,
					active: true,
					tags: [],
					metadata: null,
				});
			});
			expect(checkResult2).toBe(true);
		});

		test("boolean の比較が正しく動作すること", () => {
			const { result } = renderHook(() => useFormDirty<ComplexFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					count: 10,
					active: true,
					tags: [],
					metadata: null,
				});
			});

			// 同じboolean
			let checkResult1 = false;
			act(() => {
				checkResult1 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: true,
					tags: [],
					metadata: null,
				});
			});
			expect(checkResult1).toBe(false);

			// 異なるboolean
			let checkResult2 = false;
			act(() => {
				checkResult2 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: false,
					tags: [],
					metadata: null,
				});
			});
			expect(checkResult2).toBe(true);
		});

		test("配列の比較が正しく動作すること", () => {
			const { result } = renderHook(() => useFormDirty<ComplexFormData>());

			act(() => {
				result.current.setInitialState({
					name: "Test",
					count: 10,
					active: true,
					tags: ["a", "b"],
					metadata: null,
				});
			});

			// 同じ配列
			let checkResult1 = false;
			act(() => {
				checkResult1 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: true,
					tags: ["a", "b"],
					metadata: null,
				});
			});
			expect(checkResult1).toBe(false);

			// 異なる配列（要素が異なる）
			let checkResult2 = false;
			act(() => {
				checkResult2 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: true,
					tags: ["a", "c"],
					metadata: null,
				});
			});
			expect(checkResult2).toBe(true);

			// 異なる配列（要素数が異なる）
			let checkResult3 = false;
			act(() => {
				checkResult3 = result.current.checkDirty({
					name: "Test",
					count: 10,
					active: true,
					tags: ["a"],
					metadata: null,
				});
			});
			expect(checkResult3).toBe(true);
		});

		test("複数回の状態変更を追跡できること", () => {
			const { result } = renderHook(() => useFormDirty<TestFormData>());

			act(() => {
				result.current.setInitialState({ name: "Initial", email: null });
			});

			// 変更1: dirty
			act(() => {
				result.current.checkDirty({ name: "Changed", email: null });
			});
			expect(result.current.isDirty).toBe(true);

			// 変更2: 元に戻す -> not dirty
			act(() => {
				result.current.checkDirty({ name: "Initial", email: null });
			});
			expect(result.current.isDirty).toBe(false);

			// 変更3: 再度変更 -> dirty
			act(() => {
				result.current.checkDirty({ name: "Changed Again", email: null });
			});
			expect(result.current.isDirty).toBe(true);
		});
	});
});
