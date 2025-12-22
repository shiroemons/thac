import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { AdminNavbar } from "./admin-navbar";
import { AdminSidebar } from "./admin-sidebar";

interface AdminLayoutProps {
	user: {
		id: string;
		name: string | null;
		email: string;
		role?: string | null;
	} | null;
}

export function AdminLayout({ user }: AdminLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const closeDrawer = () => {
		const checkbox = document.getElementById(
			"admin-drawer",
		) as HTMLInputElement;
		if (checkbox) {
			checkbox.checked = false;
		}
	};

	const toggleSidebar = () => {
		setSidebarOpen((prev) => !prev);
	};

	return (
		<div className={`drawer ${sidebarOpen ? "lg:drawer-open" : ""}`}>
			<input id="admin-drawer" type="checkbox" className="drawer-toggle" />

			{/* Main content */}
			<div className="drawer-content flex flex-col">
				<AdminNavbar user={user} onToggleSidebar={toggleSidebar} />
				<main className="flex-1 bg-base-200/30 p-4 lg:p-6">
					<Outlet />
				</main>
			</div>

			{/* Sidebar */}
			<div className="drawer-side z-40">
				<label
					htmlFor="admin-drawer"
					aria-label="サイドバーを閉じる"
					className="drawer-overlay"
				/>
				<AdminSidebar onNavigate={closeDrawer} />
			</div>
		</div>
	);
}
