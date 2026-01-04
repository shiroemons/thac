import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { ExternalLinkModal } from "@/components/public/external-link-modal";

interface ExternalLinkContextValue {
	openExternalLink: (url: string) => void;
}

const ExternalLinkContext = createContext<ExternalLinkContextValue | null>(
	null,
);

interface ExternalLinkProviderProps {
	children: React.ReactNode;
}

/**
 * 外部リンクモーダルのProvider
 */
export function ExternalLinkProvider({ children }: ExternalLinkProviderProps) {
	const [url, setUrl] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const openExternalLink = useCallback((targetUrl: string) => {
		setUrl(targetUrl);
		setIsOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
		// アニメーション後にURLをクリア
		setTimeout(() => setUrl(null), 200);
	}, []);

	const value = useMemo(
		() => ({
			openExternalLink,
		}),
		[openExternalLink],
	);

	return (
		<ExternalLinkContext.Provider value={value}>
			{children}
			<ExternalLinkModal url={url} isOpen={isOpen} onClose={handleClose} />
		</ExternalLinkContext.Provider>
	);
}

/**
 * 外部リンクモーダルを開くためのhook
 */
export function useExternalLink(): ExternalLinkContextValue {
	const context = useContext(ExternalLinkContext);
	if (!context) {
		throw new Error(
			"useExternalLink must be used within an ExternalLinkProvider",
		);
	}
	return context;
}
