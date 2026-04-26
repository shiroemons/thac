import type { AlbumRequestStatus } from "@/lib/api-client";
import { ALBUM_REQUEST_STATUS_LABELS } from "@/lib/api-client";

interface AlbumRequestStatusBadgeProps {
	status: AlbumRequestStatus;
}

const STATUS_BADGE_CLASSES: Record<AlbumRequestStatus, string> = {
	pending: "badge badge-warning",
	approved: "badge badge-success",
	rejected: "badge badge-error",
};

export function AlbumRequestStatusBadge({
	status,
}: AlbumRequestStatusBadgeProps) {
	return (
		<span className={STATUS_BADGE_CLASSES[status]}>
			{ALBUM_REQUEST_STATUS_LABELS[status]}
		</span>
	);
}
