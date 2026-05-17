import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

interface SortableItem {
	id: string;
}

interface SortableCollectionItemsProps<T extends SortableItem> {
	items: T[];
	renderItem: (item: T, index: number) => ReactNode;
	onReorder: (newOrder: T[]) => void;
	disabled?: boolean;
}

export function SortableCollectionItems<T extends SortableItem>({
	items,
	renderItem,
	onReorder,
	disabled = false,
}: SortableCollectionItemsProps<T>) {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((i) => i.id === active.id);
		const newIndex = items.findIndex((i) => i.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		onReorder(arrayMove(items, oldIndex, newIndex));
	};

	if (disabled) {
		return (
			<ul className="space-y-2">
				{items.map((item, idx) => (
					<li key={item.id}>{renderItem(item, idx)}</li>
				))}
			</ul>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={items.map((i) => i.id)}
				strategy={verticalListSortingStrategy}
			>
				<ul className="space-y-2">
					{items.map((item, index) => (
						<SortableRow key={item.id} id={item.id}>
							{renderItem(item, index)}
						</SortableRow>
					))}
				</ul>
			</SortableContext>
		</DndContext>
	);
}

function SortableRow({ id, children }: { id: string; children: ReactNode }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<li ref={setNodeRef} style={style} className="flex items-center gap-2">
			<button
				type="button"
				aria-label="並び替えハンドル"
				className="btn btn-ghost btn-sm cursor-grab touch-none active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4 opacity-60" />
			</button>
			<div className="flex-1">{children}</div>
		</li>
	);
}
