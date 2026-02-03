import { createFileRoute } from "@tanstack/react-router";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) =>
				proxyToBackend(request, params._splat),
			POST: async ({ request, params }) =>
				proxyToBackend(request, params._splat),
		},
	},
});

async function proxyToBackend(
	request: Request,
	path: string | undefined,
): Promise<Response> {
	if (!path) {
		return new Response("Not Found", { status: 404 });
	}
	const url = new URL(request.url);
	const targetUrl = `${SERVER_URL}/api/auth/${path}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete("host");

	const response = await fetch(targetUrl, {
		method: request.method,
		headers,
		body: request.method !== "GET" ? request.body : undefined,
		redirect: "manual",
		// @ts-expect-error - duplex is needed for streaming body
		duplex: "half",
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});
}
