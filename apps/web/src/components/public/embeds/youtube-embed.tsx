import { getYouTubeEmbedUrl } from "@/lib/embed-utils";

interface YouTubeEmbedProps {
	videoId: string;
	title?: string;
	className?: string;
}

/**
 * YouTube動画の埋め込みプレイヤー
 * プライバシー強化モード（youtube-nocookie.com）を使用
 */
export function YouTubeEmbed({
	videoId,
	title = "YouTube video player",
	className,
}: YouTubeEmbedProps) {
	const embedUrl = getYouTubeEmbedUrl(videoId);

	return (
		<div className={`aspect-video w-full ${className ?? ""}`}>
			<iframe
				src={embedUrl}
				title={title}
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowFullScreen
				loading="lazy"
				className="size-full rounded-lg"
			/>
		</div>
	);
}
