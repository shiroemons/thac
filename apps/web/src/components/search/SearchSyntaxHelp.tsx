import { Check, Copy, HelpCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { searchSyntaxHelp } from "./mock-data";

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
											<code className="rounded bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
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
