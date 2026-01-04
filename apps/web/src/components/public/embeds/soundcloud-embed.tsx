import { getSoundCloudEmbedUrl } from "@/lib/embed-utils";

interface SoundCloudEmbedProps {
	trackUrl: string;
	title?: string;
	className?: string;
}

/**
 * SoundCloudの埋め込みプレイヤー
 */
export function SoundCloudEmbed({
	trackUrl,
	title = "SoundCloud player",
	className,
}: SoundCloudEmbedProps) {
	const embedUrl = getSoundCloudEmbedUrl(trackUrl);

	return (
		<div className={`w-full ${className ?? ""}`}>
			<iframe
				src={embedUrl}
				title={title}
				allow="autoplay"
				loading="lazy"
				className="w-full rounded-lg"
				height="166"
				scrolling="no"
				frameBorder="no"
			/>
		</div>
	);
}
