import type { EmbedInfo } from "@/types/publication";
import { NiconicoEmbed } from "./niconico-embed";
import { SoundCloudEmbed } from "./soundcloud-embed";
import { YouTubeEmbed } from "./youtube-embed";

interface MediaEmbedProps {
	embed: EmbedInfo;
	title?: string;
	className?: string;
}

/**
 * 統合メディア埋め込みコンポーネント
 * EmbedInfoの型に応じて適切なプレイヤーを表示
 */
export function MediaEmbed({ embed, title, className }: MediaEmbedProps) {
	switch (embed.type) {
		case "youtube":
			return (
				<YouTubeEmbed videoId={embed.id} title={title} className={className} />
			);
		case "niconico":
			return (
				<NiconicoEmbed videoId={embed.id} title={title} className={className} />
			);
		case "soundcloud":
			return (
				<SoundCloudEmbed
					trackUrl={embed.id}
					title={title}
					className={className}
				/>
			);
		default:
			return null;
	}
}

interface MediaEmbedListProps {
	embeds: EmbedInfo[];
	className?: string;
}

/**
 * 複数のメディア埋め込みを表示するコンポーネント
 */
export function MediaEmbedList({ embeds, className }: MediaEmbedListProps) {
	if (embeds.length === 0) return null;

	return (
		<div className={`grid gap-4 ${className ?? ""}`}>
			{embeds.map((embed, index) => (
				<MediaEmbed
					key={`${embed.type}-${embed.id}-${index}`}
					embed={embed}
					className="w-full"
				/>
			))}
		</div>
	);
}
