import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";

interface ReorderButtonsProps {
	sortOrder: number;
	onMoveUp: () => void;
	onMoveDown: () => void;
	isFirst: boolean;
	isLast: boolean;
	disabled?: boolean;
}

export function ReorderButtons({
	sortOrder,
	onMoveUp,
	onMoveDown,
	isFirst,
	isLast,
	disabled = false,
}: ReorderButtonsProps) {
	return (
		<div className="flex items-center gap-1">
			<span className="w-8 text-center text-base-content/50 text-sm">
				{sortOrder}
			</span>
			<Button
				variant="ghost"
				size="icon"
				onClick={onMoveUp}
				disabled={isFirst || disabled}
				title="上へ移動"
			>
				<ChevronUp className="h-4 w-4" />
				<span className="sr-only">上へ移動</span>
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={onMoveDown}
				disabled={isLast || disabled}
				title="下へ移動"
			>
				<ChevronDown className="h-4 w-4" />
				<span className="sr-only">下へ移動</span>
			</Button>
		</div>
	);
}
