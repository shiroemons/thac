import { useState } from "react";
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
import { Label } from "@/components/ui/label";

export interface FieldConfig {
	name: string;
	label: string;
	placeholder: string;
	required?: boolean;
}

interface CreateDialogProps {
	title: string;
	description?: string;
	fields: FieldConfig[];
	onCreate: (data: Record<string, string>) => Promise<void>;
	onSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function CreateDialog({
	title,
	description,
	fields,
	onCreate,
	onSuccess,
	open,
	onOpenChange,
}: CreateDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);

	// 外部制御と内部制御の両方をサポート
	const isOpen = open ?? internalOpen;
	const setIsOpen = onOpenChange ?? setInternalOpen;
	const [formData, setFormData] = useState<Record<string, string>>(() =>
		fields.reduce(
			(acc, field) => {
				acc[field.name] = "";
				return acc;
			},
			{} as Record<string, string>,
		),
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleChange = (name: string, value: string) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleCreate = async () => {
		const requiredFields = fields.filter((f) => f.required);
		const missingFields = requiredFields.filter((f) => !formData[f.name]);

		if (missingFields.length > 0) {
			setError(`${missingFields.map((f) => f.label).join("、")}は必須です`);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			await onCreate(formData);
			handleClose();
			onSuccess?.();
		} catch (e) {
			setError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setFormData(
			fields.reduce(
				(acc, field) => {
					acc[field.name] = "";
					return acc;
				},
				{} as Record<string, string>,
			),
		);
		setError(null);
	};

	// 外部制御の場合はトリガーを表示しない
	const isControlled = open !== undefined;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			{!isControlled && (
				<DialogTrigger asChild>
					<Button>新規作成</Button>
				</DialogTrigger>
			)}
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{fields.map((field) => (
						<div key={field.name} className="grid gap-2">
							<Label htmlFor={field.name}>
								{field.label}
								{field.required && (
									<span className="ml-1 text-destructive">*</span>
								)}
							</Label>
							<Input
								id={field.name}
								name={field.name}
								placeholder={field.placeholder}
								value={formData[field.name]}
								onChange={(e) => handleChange(field.name, e.target.value)}
								autoComplete="off"
							/>
						</div>
					))}

					{error && (
						<div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
							{error}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={handleClose}>
						キャンセル
					</Button>
					<Button variant="primary" onClick={handleCreate} disabled={loading}>
						{loading ? "作成中..." : "作成"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
