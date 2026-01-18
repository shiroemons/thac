import type { ReactNode } from "react";

/**
 * EntityDetailHeader のプロパティ
 */
export interface EntityDetailHeaderProps {
	/**
	 * グラデーションクラス名（例: "gradient-artist", "gradient-circle", "gradient-release"）
	 * 指定しない場合は bg-base-100 を使用
	 */
	gradientClass?: string;
	/**
	 * ヘッダーに表示するアイコン（Lucide アイコンなど）
	 * アイコンのサイズはコンポーネント内で適切に設定されるため、
	 * アイコン自体には色クラスのみを指定することを推奨
	 */
	icon: ReactNode;
	/**
	 * アイコンコンテナのリングカラークラス（例: "ring-primary/20", "ring-info/20"）
	 * デフォルトは "ring-primary/20"
	 */
	iconRingClass?: string;
	/**
	 * メインタイトル
	 */
	title: string;
	/**
	 * サブタイトル（日本語名、別名など）
	 */
	subtitle?: string;
	/**
	 * バッジ要素の配列
	 */
	badges?: ReactNode[];
	/**
	 * 追加コンテンツ（外部リンク、メタ情報など）
	 * ヘッダー右側に表示される
	 */
	children?: ReactNode;
}

/**
 * 詳細ページ用の統一ヘッダーコンポーネント
 *
 * 各エンティティ（アーティスト、サークル、イベント、作品、トラック、原曲）の
 * 詳細ページで使用できる再利用可能なヘッダーを提供します。
 *
 * @example
 * ```tsx
 * // アーティスト詳細ページでの使用例
 * <EntityDetailHeader
 *   gradientClass="gradient-artist"
 *   icon={<User className="size-10 text-primary sm:size-12" />}
 *   iconRingClass="ring-primary/20"
 *   title={artist.name}
 *   subtitle={!artist.isMainName ? artist.artistName : undefined}
 *   badges={artist.roles.map((role) => (
 *     <span key={role.roleCode} className="badge badge-primary badge-outline">
 *       {role.label}
 *     </span>
 *   ))}
 * />
 *
 * // サークル詳細ページでの使用例
 * <EntityDetailHeader
 *   gradientClass="gradient-circle"
 *   icon={<Building2 className="size-10 text-info sm:size-12" />}
 *   iconRingClass="ring-info/20"
 *   title={circle.name}
 *   subtitle={circle.nameJa !== circle.name ? circle.nameJa : undefined}
 *   badges={[
 *     <span key="initial" className="badge badge-ghost badge-sm">
 *       {circle.nameInitial}
 *     </span>
 *   ]}
 * >
 *   {circle.links.map((link) => (
 *     <ExternalLink key={link.id} href={link.url} className="btn btn-outline btn-sm">
 *       {link.platformName}
 *     </ExternalLink>
 *   ))}
 * </EntityDetailHeader>
 * ```
 */
export function EntityDetailHeader({
	gradientClass,
	icon,
	iconRingClass = "ring-primary/20",
	title,
	subtitle,
	badges,
	children,
}: EntityDetailHeaderProps) {
	const containerClass = gradientClass
		? `${gradientClass} rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-lg`
		: "rounded-2xl bg-base-100 shadow-sm transition-shadow duration-300 hover:shadow-lg";

	const innerClass = gradientClass ? "glass-card-light rounded-2xl p-6" : "p-6";

	return (
		<div className={containerClass}>
			<div className={innerClass}>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					{/* 左側: アイコン、タイトル、バッジ */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
						{/* アバター/アイコン */}
						<div
							className={`flex size-20 shrink-0 items-center justify-center rounded-full bg-base-100/80 shadow-lg ring-2 ${iconRingClass} transition-transform duration-300 hover:scale-105 sm:size-24`}
						>
							{icon}
						</div>

						<div className="min-w-0 flex-1 space-y-3">
							{/* タイトルとサブタイトル */}
							<div>
								<h1 className="font-bold text-2xl sm:text-3xl">{title}</h1>
								{subtitle && (
									<p className="mt-1 text-base-content/70">{subtitle}</p>
								)}
							</div>

							{/* バッジ */}
							{badges && badges.length > 0 && (
								<div className="flex flex-wrap gap-2">{badges}</div>
							)}
						</div>
					</div>

					{/* 右側: 追加コンテンツ（外部リンクなど） */}
					{children && (
						<div className="flex flex-wrap gap-2 sm:shrink-0">{children}</div>
					)}
				</div>
			</div>
		</div>
	);
}
