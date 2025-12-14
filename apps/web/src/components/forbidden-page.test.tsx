import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import ForbiddenPage from "./forbidden-page";

afterEach(() => {
	cleanup();
});

describe("ForbiddenPage", () => {
	test("renders 403 Forbidden message", () => {
		render(<ForbiddenPage />);

		expect(screen.getByText("403 Forbidden")).toBeDefined();
		expect(
			screen.getByText("このページにアクセスする権限がありません。"),
		).toBeDefined();
	});
});
