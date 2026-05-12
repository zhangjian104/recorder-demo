import { useEffect } from "react";

/** 与 editor-bridge.js 约定一致：注入完成后向页面 postMessage */
export const DEMOLENS_EXTENSION_READY_TYPE = "CURSORFUL_EXTENSION_READY";

export type DemolensExtensionReadyPayload = {
	type: typeof DEMOLENS_EXTENSION_READY_TYPE;
	version?: string;
};

/**
 * DemoLens 插件与编辑页的交互。
 * 在编辑器挂载后监听 window message，响应 content 注入脚本发来的就绪信号。
 */
export function useDemolens(): void {
	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			// 仅处理同源页面上下文注入脚本发来的消息（与 bridge 使用 window.postMessage 一致）
			if (event.source !== window) return;
			const data = event.data;
			if (!data || typeof data !== "object") return;
			if ((data as { type?: unknown }).type !== DEMOLENS_EXTENSION_READY_TYPE) return;

			const version = (data as DemolensExtensionReadyPayload).version;
			console.log("[DemoLens] 收到 CURSORFUL_EXTENSION_READY", { version });
		};

		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);
}
