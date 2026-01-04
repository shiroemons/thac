import {
	Download,
	ExternalLink as ExternalLinkIcon,
	Headphones,
	LinkIcon,
	ShoppingBag,
	Video,
} from "lucide-react";
import { useMemo } from "react";
import { getEmbedInfo } from "@/lib/embed-utils";
import {
	groupByCategory,
	isGroupedPublicationsEmpty,
} from "@/lib/publication-utils";
import type {
	EmbedInfo,
	PlatformCategory,
	PublicationWithPlatform,
} from "@/types/publication";
import { MediaEmbed } from "./embeds";
import { ExternalLink } from "./external-link";

interface PublicationLinksProps {
	publications: PublicationWithPlatform[];
	showEmbeds?: boolean;
	title?: string;
}

/** カテゴリごとのアイコンとラベル */
const categoryConfig: Record<
	PlatformCategory,
	{ icon: React.ElementType; label: string }
> = {
	streaming: { icon: Headphones, label: "ストリーミング" },
	video: { icon: Video, label: "動画" },
	download: { icon: Download, label: "ダウンロード" },
	shop: { icon: ShoppingBag, label: "ショップ" },
	other: { icon: LinkIcon, label: "その他" },
};

/** カテゴリの表示順序 */
const categoryOrder: PlatformCategory[] = [
	"streaming",
	"video",
	"download",
	"shop",
	"other",
];

/**
 * 配信リンク表示コンポーネント
 * カテゴリ別にグループ化して表示
 */
export function PublicationLinks({
	publications,
	showEmbeds = true,
	title = "配信・購入リンク",
}: PublicationLinksProps) {
	const grouped = useMemo(() => groupByCategory(publications), [publications]);

	// 埋め込み可能なメディアを抽出
	const embeds = useMemo(() => {
		if (!showEmbeds) return [];
		const result: EmbedInfo[] = [];
		for (const pub of publications) {
			const embedInfo = getEmbedInfo(pub.platformCode, pub.url);
			if (embedInfo) {
				result.push(embedInfo);
			}
		}
		return result;
	}, [publications, showEmbeds]);

	if (isGroupedPublicationsEmpty(grouped) && embeds.length === 0) {
		return null;
	}

	return (
		<div className="space-y-6">
			{/* 埋め込みプレイヤー */}
			{embeds.length > 0 && (
				<div className="space-y-4">
					<h3 className="flex items-center gap-2 font-semibold text-lg">
						<Video className="size-5" />
						メディア
					</h3>
					<div className="grid gap-4 md:grid-cols-2">
						{embeds.map((embed, index) => (
							<MediaEmbed
								key={`${embed.type}-${embed.id}-${index}`}
								embed={embed}
							/>
						))}
					</div>
				</div>
			)}

			{/* リンク一覧 */}
			{!isGroupedPublicationsEmpty(grouped) && (
				<div className="space-y-4">
					<h3 className="flex items-center gap-2 font-semibold text-lg">
						<ExternalLinkIcon className="size-5" />
						{title}
					</h3>
					<div className="space-y-4">
						{categoryOrder.map((category) => {
							const pubs = grouped[category];
							if (pubs.length === 0) return null;

							const { icon: Icon, label } = categoryConfig[category];

							return (
								<div key={category} className="space-y-2">
									<h4 className="flex items-center gap-2 font-medium text-base-content/70 text-sm">
										<Icon className="size-4" />
										{label}
									</h4>
									<div className="flex flex-wrap gap-2">
										{pubs.map((pub) => (
											<ExternalLink
												key={pub.id}
												href={pub.url}
												className="btn btn-outline btn-sm gap-1"
											>
												<ExternalLinkIcon className="size-3" />
												{pub.platform.name}
											</ExternalLink>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
