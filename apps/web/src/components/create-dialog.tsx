import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	fields: FieldConfig[];
	onCreate: (data: Record<string, string>) => Promise<void>;
	onSuccess?: () => void;
}

export function CreateDialog({
	title,
	fields,
	onCreate,
	onSuccess,
}: CreateDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
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

	if (!isOpen) {
		return <Button onClick={() => setIsOpen(true)}>新規作成</Button>;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{fields.map((field) => (
							<div key={field.name}>
								<Label htmlFor={field.name}>
									{field.label}
									{field.required && (
										<span className="ml-1 text-red-500">*</span>
									)}
								</Label>
								<Input
									id={field.name}
									placeholder={field.placeholder}
									value={formData[field.name]}
									onChange={(e) => handleChange(field.name, e.target.value)}
								/>
							</div>
						))}

						{error && (
							<div className="rounded bg-red-100 p-3 text-red-700 text-sm">
								{error}
							</div>
						)}

						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={handleClose}>
								キャンセル
							</Button>
							<Button onClick={handleCreate} disabled={loading}>
								{loading ? "作成中..." : "作成"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
