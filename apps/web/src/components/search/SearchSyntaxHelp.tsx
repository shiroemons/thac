import { Check, Copy, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** 検索構文のヘルプ情報 */
interface SearchSyntaxItem {
	keyword: string;
	description: string;
	example: string;
}

/** 検索構文ヘルプデータ（静的なドキュメント情報） */
const searchSyntaxHelp: SearchSyntaxItem[] = [
	{
		keyword: "arranger:",
		description: "編曲者で検索",
		example: "arranger:ARM",
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
	{
		keyword: "originalsong:",
		description: "原曲名で検索",
		example: "originalsong:大吉キトゥン",
	},
	{
		keyword: "year:",
		description: "頒布年で検索",
		example: "year:2023",
	},
	{
		keyword: "songcount:",
		description: "原曲数で検索",
		example: "songcount:2",
	},
	{
		keyword: "songcount:>=",
		description: "原曲数（以上）で検索",
		example: "songcount:>=3",
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
										<td className="text-base-content/70">{item.description}</td>
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
