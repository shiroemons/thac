import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

export type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

// Global type definition for theme data passed from SSR script
declare global {
	interface Window {
		__THEME_DATA__?: {
			theme: Theme;
			resolvedTheme: ResolvedTheme;
		};
	}
}

interface ThemeContextValue {
	theme: Theme;
	resolvedTheme: ResolvedTheme;
	setTheme: (theme: Theme) => void;
	mounted: boolean;
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

// Get initial theme from SSR script's global variable
function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "system";
	if (window.__THEME_DATA__?.theme) {
		return window.__THEME_DATA__.theme;
	}
	return getStoredTheme();
}

// Get initial resolved theme from SSR script's global variable
function getInitialResolvedTheme(): ResolvedTheme {
	if (typeof window === "undefined") return "light";
	if (window.__THEME_DATA__?.resolvedTheme) {
		return window.__THEME_DATA__.resolvedTheme;
	}
	return resolveTheme(getStoredTheme());
}

interface ThemeProviderProps {
	children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
	// Initialize from SSR script's global variable for hydration sync
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
		getInitialResolvedTheme,
	);
	const [mounted, setMounted] = useState(false);

	// Mark as mounted after hydration
	useEffect(() => {
		setMounted(true);
	}, []);

	// Apply theme to document (only after mount to avoid hydration mismatch)
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
		mounted,
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
