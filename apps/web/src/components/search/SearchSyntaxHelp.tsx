import { Check, Copy, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** 検索構文のヘルプ情報 */
interface SearchSyntaxItem {
	keyword: string;
	description: string;
	example: string;
	tooltip?: string;
}

/** 検索構文ヘルプデータ（静的なドキュメント情報） */
const searchSyntaxHelp: SearchSyntaxItem[] = [
	// --- 人物・サークル検索 ---
	{
		keyword: "arranger:",
		description: "編曲者で検索",
		example: "arranger:ARM",
	},
	{
		keyword: "composer:",
		description: "作曲者で検索",
		example: "composer:ZUN",
	},
	{
		keyword: "vocalist:",
		description: "ボーカルで検索",
		example: "vocalist:miko",
	},
	{
		keyword: "lyricist:",
		description: "作詞者で検索",
		example: "lyricist:夕野ヨシミ",
	},
	{
		keyword: "circle:",
		description: "サークル名で検索",
		example: "circle:IOSYS",
	},
	// --- コンテンツ検索 ---
	{
		keyword: "originalsong:",
		description: "原曲名で検索",
		example: "originalsong:大吉キトゥン",
	},
	{
		keyword: "event:",
		description: "イベント名で検索",
		example: "event:例大祭",
	},
	// --- 期間検索 ---
	{
		keyword: "period:",
		description: "頒布日で期間検索（YYYY-MM-DD..YYYY-MM-DD形式）",
		example: "period:2025-01-01..2025-12-31",
	},
	{
		keyword: "date:",
		description: "頒布日で検索（=, >=, <=, >, < 対応）",
		example: "date:>=2025-01-01",
		tooltip: "例: date:2025-01-01（指定日）/ date:>=2025-01-01（以降）/ date:<2025-01-01（より前）",
	},
	// --- 数値フィルター ---
	{
		keyword: "year:",
		description: "頒布年で検索（=, >=, <=, >, < 対応）",
		example: "year:2023",
		tooltip: "例: year:2023（等しい）/ year:>=2020（以上）/ year:<2025（未満）",
	},
	{
		keyword: "originalcount:",
		description: "原曲数で検索（=, >=, <=, >, < 対応）",
		example: "originalcount:2",
		tooltip: "例: originalcount:2（等しい）/ originalcount:>=3（以上）/ originalcount:<5（未満）",
	},
	{
		keyword: "vocalistcount:",
		description: "ボーカル数で検索（=, >=, <=, >, < 対応）",
		example: "vocalistcount:>=2",
		tooltip: "例: vocalistcount:1（等しい）/ vocalistcount:>=2（以上）",
	},
	{
		keyword: "arrangercount:",
		description: "編曲者数で検索（=, >=, <=, >, < 対応）",
		example: "arrangercount:1",
		tooltip: "例: arrangercount:1（等しい）/ arrangercount:>=2（以上）",
	},
	{
		keyword: "lyricistcount:",
		description: "作詞者数で検索（=, >=, <=, >, < 対応）",
		example: "lyricistcount:>=1",
		tooltip: "例: lyricistcount:1（等しい）/ lyricistcount:>=1（以上）",
	},
	{
		keyword: "composercount:",
		description: "作曲者数で検索（=, >=, <=, >, < 対応）",
		example: "composercount:2",
		tooltip: "例: composercount:1（等しい）/ composercount:>=2（以上）",
	},
];

interface SearchSyntaxHelpProps {
	/** カスタムクラス名 */
	className?: string;
}

/**
 * 検索構文ヘルプパネル
 *
 * - 使用可能な検索キーワードの一覧
 * - 例をクリックでコピー
 * - 折りたたみ可能
 */
export function SearchSyntaxHelp({ className }: SearchSyntaxHelpProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

	const handleCopy = async (text: string, keyword: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKeyword(keyword);
			setTimeout(() => setCopiedKeyword(null), 2000);
		} catch {
			// コピー失敗時は何もしない
		}
	};

	return (
		<div className={cn("border-base-300 border-t", className)}>
			{/* ヘッダー（クリックで開閉） */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center gap-2 px-4 py-3 text-left text-base-content/60 transition-colors hover:bg-base-200/50 hover:text-base-content"
			>
				<HelpCircle className="h-4 w-4" />
				<span className="text-sm">検索構文ヘルプ</span>
			</button>

			{/* コンテンツ */}
			{isOpen && (
				<div className="border-base-300 border-t bg-base-200/30 p-4">
					<div className="overflow-x-auto">
						<table className="table-zebra table-sm table">
							<thead>
								<tr>
									<th>構文</th>
									<th>説明</th>
									<th>例</th>
									<th className="w-10" />
								</tr>
							</thead>
							<tbody>
								{searchSyntaxHelp.map((item) => (
									<tr key={item.keyword}>
										<td>
											<code className="rounded bg-base-300 px-1.5 py-0.5 text-xs">
												{item.keyword}
											</code>
										</td>
										<td className="text-base-content/70">
											{item.tooltip ? (
												<span
													className="tooltip tooltip-right cursor-help"
													data-tip={item.tooltip}
												>
													{item.description}
													<HelpCircle className="ml-1 inline h-3 w-3 text-base-content/40" />
												</span>
											) : (
												item.description
											)}
										</td>
										<td>
											<code className="rounded bg-primary px-1.5 py-0.5 text-primary-content text-xs">
												{item.example}
											</code>
										</td>
										<td>
											<button
												type="button"
												onClick={() => handleCopy(item.example, item.keyword)}
												className="btn btn-ghost btn-xs"
												title="例をコピー"
											>
												{copiedKeyword === item.keyword ? (
													<Check className="h-3 w-3 text-success" />
												) : (
													<Copy className="h-3 w-3" />
												)}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<p className="mt-3 text-base-content/50 text-xs">
						複数の条件はスペースで区切ってAND検索できます。
					</p>
				</div>
			)}
		</div>
	);
}
