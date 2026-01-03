import { Link } from "@tanstack/react-router";

export function PublicFooter() {
	return (
		<footer className="footer footer-center bg-base-200 p-6 text-base-content">
			<div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-8">
				<div className="font-semibold">東方編曲録</div>
				<nav className="flex gap-4">
					<Link to="/about" className="link link-hover">
						About
					</Link>
					<span className="text-base-content/30">|</span>
					<span className="text-base-content/50">Privacy</span>
					<span className="text-base-content/30">|</span>
					<span className="text-base-content/50">Terms</span>
				</nav>
			</div>
			<div className="text-base-content/70">
				<p>© 2025 迷い家の白猫. All rights reserved.</p>
			</div>
		</footer>
	);
}
