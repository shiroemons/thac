import { Monitor, Moon, Sun } from "lucide-react";
import { type Theme, useTheme } from "@/lib/theme";

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
	{ value: "system", label: "システム", icon: <Monitor className="size-4" /> },
	{ value: "light", label: "ライト", icon: <Sun className="size-4" /> },
	{ value: "dark", label: "ダーク", icon: <Moon className="size-4" /> },
];

export function ThemeSwitcher() {
	const { theme, setTheme, resolvedTheme } = useTheme();

	const currentIcon =
		theme === "system" ? (
			<Monitor className="size-5" />
		) : resolvedTheme === "dark" ? (
			<Moon className="size-5" />
		) : (
			<Sun className="size-5" />
		);

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={0}
				role="button"
				className="btn btn-ghost btn-circle"
				aria-label="テーマを切り替え"
			>
				{currentIcon}
			</div>
			<ul
				role="menu"
				className="dropdown-content menu z-50 w-40 rounded-box bg-base-100 p-2 shadow-lg"
			>
				{themes.map((t) => (
					<li key={t.value}>
						<button
							type="button"
							onClick={() => setTheme(t.value)}
							className={theme === t.value ? "active" : ""}
						>
							{t.icon}
							{t.label}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
