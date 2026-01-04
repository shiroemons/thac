import { getNiconicoEmbedUrl } from "@/lib/embed-utils";

interface NiconicoEmbedProps {
	videoId: string;
	title?: string;
	className?: string;
}

/**
 * ニコニコ動画の埋め込みプレイヤー
 */
export function NiconicoEmbed({
	videoId,
	title = "ニコニコ動画",
	className,
}: NiconicoEmbedProps) {
	const embedUrl = getNiconicoEmbedUrl(videoId);

	return (
		<div className={`aspect-video w-full ${className ?? ""}`}>
			<iframe
				src={embedUrl}
				title={title}
				allow="autoplay; fullscreen"
				allowFullScreen
				loading="lazy"
				className="size-full rounded-lg"
				style={{ border: "none", maxWidth: "100%", maxHeight: "100%" }}
			/>
		</div>
	);
}
