import { useCallback, useMemo, useRef } from "react";

/** 视频解析链开始（整条 loadInitialData） */
export type EditorVideoResolveStartDetail = Record<string, never>;

/** 已成功解析主视频（及可选摄像头） */
export type EditorVideoReadyDetail = {
	source: "project" | "session" | "path";
	hasWebcam: boolean;
};

/** 无视频或初始化异常 */
export type EditorVideoUnavailableDetail = { kind: "none" } | { kind: "error"; error: unknown };

export type EditorResourceLifecycleHandlers = {
	/** 首屏初始化结束（loadInitialData 的 finally 末尾） */
	onPageLoadComplete?: () => void;
	/** 开始解析 / 拉取视频来源 */
	onVideoResolveStart?: (detail: EditorVideoResolveStartDetail) => void;
	/** 已拿到可播放视频资源 */
	onVideoReady?: (detail: EditorVideoReadyDetail) => void;
	/** 无视频或拉取失败 */
	onVideoUnavailable?: (detail: EditorVideoUnavailableDetail) => void;
};

export type EditorResourceLifecycleApi = {
	notifyVideoResolveStart: () => void;
	notifyVideoReady: (detail: EditorVideoReadyDetail) => void;
	notifyVideoUnavailable: (detail: EditorVideoUnavailableDetail) => void;
	notifyPageLoadComplete: () => void;
};

const LOG_PREFIX = "[Lifecycle]";

function logLifecycle(phase: string, detail?: unknown) {
	if (detail !== undefined) {
		console.log(LOG_PREFIX, phase, detail);
	} else {
		console.log(LOG_PREFIX, phase);
	}
}

/**
 * 编辑器资源相关生命周期：页面就绪、视频解析开始 / 成功 / 不可用。
 * 触发时在控制台打印日志；可选传入 handlers 做埋点等扩展。
 */
export function useLifecycle(
	handlers: EditorResourceLifecycleHandlers = {},
): EditorResourceLifecycleApi {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;

	const notifyVideoResolveStart = useCallback(() => {
		logLifecycle("视频资源获取开始");
		handlersRef.current.onVideoResolveStart?.({});
	}, []);

	const notifyVideoReady = useCallback((detail: EditorVideoReadyDetail) => {
		logLifecycle("已获取到视频资源", detail);
		handlersRef.current.onVideoReady?.(detail);
	}, []);

	const notifyVideoUnavailable = useCallback((detail: EditorVideoUnavailableDetail) => {
		logLifecycle("获取视频资源失败或没有视频", detail);
		handlersRef.current.onVideoUnavailable?.(detail);
	}, []);

	const notifyPageLoadComplete = useCallback(() => {
		logLifecycle("页面加载完成");
		handlersRef.current.onPageLoadComplete?.();
	}, []);

	return useMemo(
		() => ({
			notifyVideoResolveStart,
			notifyVideoReady,
			notifyVideoUnavailable,
			notifyPageLoadComplete,
		}),
		[notifyPageLoadComplete, notifyVideoResolveStart, notifyVideoReady, notifyVideoUnavailable],
	);
}
