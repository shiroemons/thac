import type { MouseEvent, ReactNode } from "react";
import { useExternalLink } from "@/contexts/external-link-context";

interface ExternalLinkProps {
	href: string;
	children: ReactNode;
	className?: string;
}

/**
 * 外部リンクコンポーネント
 * クリック時にモーダルで警告を表示してから遷移
 */
export function ExternalLink({ href, children, className }: ExternalLinkProps) {
	const { openExternalLink } = useExternalLink();

	const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault();
		openExternalLink(href);
	};

	return (
		<a
			href={href}
			onClick={handleClick}
			className={className}
			rel="noopener noreferrer"
		>
			{children}
		</a>
	);
}
