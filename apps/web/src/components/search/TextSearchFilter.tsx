import { Album, Disc3, Music, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TextSearchFilters } from "./types";

interface TextSearchFilterProps {
	/** テキスト検索フィルター */
	value: TextSearchFilters;
	/** 変更ハンドラ */
	onChange: (value: TextSearchFilters) => void;
	/** カスタムクラス名 */
	className?: string;
}

interface InputFieldProps {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	icon: React.ReactNode;
}

function InputField({
	label,
	placeholder,
	value,
	onChange,
	icon,
}: InputFieldProps) {
	return (
		<div className="form-control w-full">
			<label className="label py-1">
				<span className="label-text flex items-center gap-1.5 text-sm">
					{icon}
					{label}
				</span>
			</label>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="input input-sm input-bordered w-full"
			/>
		</div>
	);
}

/**
 * テキスト検索フィルター
 *
 * 直接入力で検索できるフィールド群:
 * - アーティスト名（名義）
 * - サークル名
 * - 作品名（リリース名）
 * - トラック名
 */
export function TextSearchFilter({
	value,
	onChange,
	className,
}: TextSearchFilterProps) {
	const handleChange = (field: keyof TextSearchFilters, newValue: string) => {
		onChange({ ...value, [field]: newValue });
	};

	return (
		<div className={cn("grid gap-3 sm:grid-cols-2", className)}>
			<InputField
				label="アーティスト名"
				placeholder="例: miko、ARM"
				value={value.artistName}
				onChange={(v) => handleChange("artistName", v)}
				icon={<User className="h-3.5 w-3.5" />}
			/>
			<InputField
				label="サークル名"
				placeholder="例: IOSYS、幽閉サテライト"
				value={value.circleName}
				onChange={(v) => handleChange("circleName", v)}
				icon={<Disc3 className="h-3.5 w-3.5" />}
			/>
			<InputField
				label="作品名"
				placeholder="例: 東方紅魔郷アレンジ"
				value={value.albumName}
				onChange={(v) => handleChange("albumName", v)}
				icon={<Album className="h-3.5 w-3.5" />}
			/>
			<InputField
				label="トラック名"
				placeholder="例: Bad Apple!!"
				value={value.trackName}
				onChange={(v) => handleChange("trackName", v)}
				icon={<Music className="h-3.5 w-3.5" />}
			/>
		</div>
	);
}
