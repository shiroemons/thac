import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">インポート</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						CSV または JSON ファイルをアップロードしてください
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<Input
						ref={fileInputRef}
						type="file"
						accept=".csv,.json"
						onChange={handleFileChange}
					/>

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
							{error}
						</div>
					)}

					{result && (
						<div className="rounded-md bg-green-500/10 p-3 text-green-600 text-sm">
							<p className="font-medium">インポートが完了しました</p>
							<p className="mt-1">
								作成: {result.created}件 / 更新: {result.updated}件 / 合計:{" "}
								{result.total}件
							</p>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleClose}>
						閉じる
					</Button>
					<Button onClick={handleImport} disabled={!file || loading}>
						{loading ? "インポート中..." : "インポート"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
