import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ImportResult } from "@/lib/api-client";

interface ImportDialogProps {
	title: string;
	onImport: (file: File) => Promise<ImportResult>;
	onSuccess?: () => void;
}

export function ImportDialog({
	title,
	onImport,
	onSuccess,
}: ImportDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<ImportResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			setResult(null);
			setError(null);
		}
	};

	const handleImport = async () => {
		if (!file) return;

		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const res = await onImport(file);
			setResult(res);
			onSuccess?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : "インポートに失敗しました");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setFile(null);
		setResult(null);
		setError(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	if (!isOpen) {
		return (
			<Button variant="outline" onClick={() => setIsOpen(true)}>
				インポート
			</Button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<Input
								ref={fileInputRef}
								type="file"
								accept=".csv,.json"
								onChange={handleFileChange}
							/>
							<p className="mt-1 text-slate-500 text-sm">
								CSV または JSON ファイルをアップロードしてください
							</p>
						</div>

						{error && (
							<div className="rounded bg-red-100 p-3 text-red-700 text-sm">
								{error}
							</div>
						)}

						{result && (
							<div className="rounded bg-green-100 p-3 text-green-700 text-sm">
								<p>インポートが完了しました</p>
								<p>
									作成: {result.created}件 / 更新: {result.updated}件 / 合計:{" "}
									{result.total}件
								</p>
							</div>
						)}

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={handleClose}>
								閉じる
							</Button>
							<Button onClick={handleImport} disabled={!file || loading}>
								{loading ? "インポート中..." : "インポート"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
