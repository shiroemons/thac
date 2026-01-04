import { ExternalLink as ExternalLinkIcon, Mic, Users } from "lucide-react";
import type { ArtistLinkDisplay, CircleLinkDisplay } from "@/types/publication";
import { ExternalLink } from "./external-link";

interface RelatedLinksProps {
	circleLinks?: CircleLinkDisplay[];
	artistLinks?: ArtistLinkDisplay[];
	title?: string;
}

/**
 * 関連エンティティのリンク表示コンポーネント
 * サークル・アーティストのSNS等を表示
 */
export function RelatedLinks({
	circleLinks = [],
	artistLinks = [],
	title = "関連リンク",
}: RelatedLinksProps) {
	// 公式・プライマリリンクを優先してフィルタリング
	const filteredCircleLinks = circleLinks
		.filter((link) => link.isOfficial || link.isPrimary)
		.slice(0, 10);

	const filteredArtistLinks = artistLinks
		.filter((link) => link.isOfficial || link.isPrimary)
		.slice(0, 10);

	if (filteredCircleLinks.length === 0 && filteredArtistLinks.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4">
			<h3 className="flex items-center gap-2 font-semibold text-lg">
				<ExternalLinkIcon className="size-5" />
				{title}
			</h3>

			{/* サークルのリンク */}
			{filteredCircleLinks.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-base-content/70 text-sm">
						<Users className="size-4" />
						サークル
					</h4>
					<div className="flex flex-wrap gap-2">
						{filteredCircleLinks.map((link) => (
							<ExternalLink
								key={link.id}
								href={link.url}
								className="btn btn-outline btn-sm gap-1"
							>
								<ExternalLinkIcon className="size-3" />
								{link.circleName} - {link.platformName}
							</ExternalLink>
						))}
					</div>
				</div>
			)}

			{/* アーティストのリンク */}
			{filteredArtistLinks.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-base-content/70 text-sm">
						<Mic className="size-4" />
						アーティスト
					</h4>
					<div className="flex flex-wrap gap-2">
						{filteredArtistLinks.map((link) => (
							<ExternalLink
								key={link.id}
								href={link.url}
								className="btn btn-outline btn-sm gap-1"
							>
								<ExternalLinkIcon className="size-3" />
								{link.artistName} - {link.platformName}
							</ExternalLink>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
