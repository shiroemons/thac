import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
	if (theme === "system") {
		return getSystemTheme();
	}
	return theme;
}

function getStoredTheme(): Theme {
	if (typeof window === "undefined") return "system";
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "system";
}

interface ThemeProviderProps {
	children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>("system");
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
	const [mounted, setMounted] = useState(false);

	// Initialize theme from localStorage on mount
	useEffect(() => {
		const storedTheme = getStoredTheme();
		setThemeState(storedTheme);
		setResolvedTheme(resolveTheme(storedTheme));
		setMounted(true);
	}, []);

	// Apply theme to document
	useEffect(() => {
		if (!mounted) return;
		document.documentElement.setAttribute("data-theme", resolvedTheme);
	}, [resolvedTheme, mounted]);

	// Listen for system theme changes
	useEffect(() => {
		if (!mounted || theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			setResolvedTheme(getSystemTheme());
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme, mounted]);

	const setTheme = useCallback((newTheme: Theme) => {
		setThemeState(newTheme);
		setResolvedTheme(resolveTheme(newTheme));
		try {
			localStorage.setItem(STORAGE_KEY, newTheme);
		} catch {
			// localStorage might be unavailable
		}
	}, []);

	const value: ThemeContextValue = {
		theme,
		resolvedTheme,
		setTheme,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
