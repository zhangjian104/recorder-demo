import type { RecordingSession, StoreRecordedSessionInput } from "@/lib/recordingSession";

const CURRENT_VIDEO_URL_KEY = "openscreen:web:current-video-url";
const SHORTCUTS_STORAGE_KEY = "openscreen:web:shortcuts";
const PROJECT_UNSUPPORTED_MESSAGE = "Project file actions are not available in web mode.";

let currentVideoPath: string | null = null;
let currentRecordingSession: RecordingSession | null = null;

function safeSessionStorageGet(key: string): string | null {
	try {
		return window.sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

function safeSessionStorageSet(key: string, value: string | null): void {
	try {
		if (value === null) {
			window.sessionStorage.removeItem(key);
			return;
		}
		window.sessionStorage.setItem(key, value);
	} catch {
		// Ignore sessionStorage failures in restricted browser contexts.
	}
}

function safeLocalStorageGet<T>(key: string): T | null {
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function safeLocalStorageSet(key: string, value: unknown): void {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Ignore localStorage failures in restricted browser contexts.
	}
}

function detectPlatform(): string {
	const userAgent = navigator.userAgent.toLowerCase();
	const platform = navigator.platform.toLowerCase();
	if (userAgent.includes("mac") || platform.includes("mac")) {
		return "darwin";
	}
	if (userAgent.includes("win") || platform.includes("win")) {
		return "win32";
	}
	return "linux";
}

function inferMimeType(fileName: string): string {
	const lower = fileName.toLowerCase();
	if (lower.endsWith(".gif")) return "image/gif";
	if (lower.endsWith(".webm")) return "video/webm";
	if (lower.endsWith(".mov")) return "video/quicktime";
	return "video/mp4";
}

function triggerDownload(buffer: ArrayBuffer, fileName: string): void {
	const blob = new Blob([buffer], { type: inferMimeType(fileName) });
	const blobUrl = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = blobUrl;
	anchor.download = fileName;
	anchor.rel = "noopener";
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	window.setTimeout(() => {
		URL.revokeObjectURL(blobUrl);
	}, 1000);
}

function setCurrentVideoPathInternal(path: string): { success: boolean; message?: string } {
	if (typeof path !== "string" || !path.trim()) {
		return { success: false, message: "Invalid video path." };
	}

	currentVideoPath = path;
	currentRecordingSession = {
		screenVideoPath: path,
		createdAt: Date.now(),
	};
	safeSessionStorageSet(CURRENT_VIDEO_URL_KEY, path);
	return { success: true };
}

function getCurrentVideoPathInternal(): string | null {
	if (currentVideoPath) return currentVideoPath;
	const cached = safeSessionStorageGet(CURRENT_VIDEO_URL_KEY);
	if (cached) {
		currentVideoPath = cached;
		currentRecordingSession = {
			screenVideoPath: cached,
			createdAt: Date.now(),
		};
	}
	return currentVideoPath;
}

function openVideoFilePickerInternal(): Promise<{
	success: boolean;
	path?: string;
	canceled?: boolean;
	error?: string;
}> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".webm,.mp4,.mov,.avi,.mkv,video/*";

		let settled = false;
		const finish = (result: { success: boolean; path?: string; canceled?: boolean; error?: string }) => {
			if (settled) return;
			settled = true;
			resolve(result);
		};

		const handleWindowFocus = () => {
			window.setTimeout(() => {
				if (!settled && (!input.files || input.files.length === 0)) {
					finish({ success: false, canceled: true });
				}
			}, 0);
		};

		window.addEventListener("focus", handleWindowFocus, { once: true });
		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (!file) {
				finish({ success: false, canceled: true });
				return;
			}

			const blobUrl = URL.createObjectURL(file);
			const setResult = setCurrentVideoPathInternal(blobUrl);
			if (!setResult.success) {
				finish({ success: false, error: setResult.message });
				return;
			}

			finish({
				success: true,
				path: blobUrl,
			});
		});

		input.click();
	});
}

function createWebElectronApi(): Window["electronAPI"] {
	return {
		getSources: async () => [],
		switchToEditor: async () => {
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.set("windowType", "editor");
			window.history.replaceState({}, "", nextUrl.toString());
		},
		switchToHud: async () => {
			const nextUrl = new URL(window.location.href);
			nextUrl.searchParams.delete("windowType");
			window.history.replaceState({}, "", nextUrl.toString());
		},
		startNewRecording: async () => ({
			success: false,
			error: "Recording is not available in web mode.",
		}),
		openSourceSelector: async () => {},
		selectSource: async () => null,
		getSelectedSource: async () => null,
		requestCameraAccess: async () => {
			if (!navigator.mediaDevices?.getUserMedia) {
				return {
					success: false,
					granted: false,
					status: "unsupported",
					error: "Camera access is not supported in this browser.",
				};
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: true,
				});
				stream.getTracks().forEach((track) => track.stop());
				return {
					success: true,
					granted: true,
					status: "granted",
				};
			} catch (error) {
				return {
					success: true,
					granted: false,
					status: error instanceof DOMException ? error.name : "unknown",
					error: String(error),
				};
			}
		},
		storeRecordedVideo: async () => ({
			success: false,
			message: "Recording is not available in web mode.",
		}),
		storeRecordedSession: async (_payload: StoreRecordedSessionInput) => ({
			success: false,
			message: "Recording is not available in web mode.",
		}),
		getRecordedVideoPath: async () => {
			const path = getCurrentVideoPathInternal();
			return path ? { success: true, path } : { success: false, message: "No video loaded." };
		},
		getAssetBasePath: async () => null,
		setRecordingState: async () => {},
		getCursorTelemetry: async () => ({
			success: true,
			samples: [],
		}),
		onStopRecordingFromTray: () => () => {},
		openExternalUrl: async (url: string) => {
			window.open(url, "_blank", "noopener,noreferrer");
			return { success: true };
		},
		saveExportedVideo: async (videoData: ArrayBuffer, fileName: string) => {
			triggerDownload(videoData, fileName);
			return {
				success: true,
				path: fileName,
				message: "Downloaded",
			};
		},
		openVideoFilePicker: async () => openVideoFilePickerInternal(),
		setCurrentVideoPath: async (path: string) => setCurrentVideoPathInternal(path),
		setCurrentRecordingSession: async (session: RecordingSession | null) => {
			currentRecordingSession = session;
			if (session?.screenVideoPath) {
				currentVideoPath = session.screenVideoPath;
				safeSessionStorageSet(CURRENT_VIDEO_URL_KEY, session.screenVideoPath);
			}
			return {
				success: true,
				session: currentRecordingSession ?? undefined,
			};
		},
		getCurrentVideoPath: async () => {
			const path = getCurrentVideoPathInternal();
			return path ? { success: true, path } : { success: false };
		},
		getCurrentRecordingSession: async () => {
			if (currentRecordingSession) {
				return { success: true, session: currentRecordingSession };
			}
			const path = getCurrentVideoPathInternal();
			if (!path) return { success: false };
			return {
				success: true,
				session: {
					screenVideoPath: path,
					createdAt: Date.now(),
				},
			};
		},
		readBinaryFile: async (filePath: string) => {
			try {
				const response = await fetch(filePath);
				if (!response.ok) {
					return {
						success: false,
						message: `Failed to read file: ${response.status}`,
					};
				}
				return {
					success: true,
					data: await response.arrayBuffer(),
					path: filePath,
				};
			} catch (error) {
				return {
					success: false,
					message: "Failed to read file",
					error: String(error),
				};
			}
		},
		clearCurrentVideoPath: async () => {
			currentVideoPath = null;
			currentRecordingSession = null;
			safeSessionStorageSet(CURRENT_VIDEO_URL_KEY, null);
			return { success: true };
		},
		saveProjectFile: async () => ({
			success: false,
			canceled: true,
			message: PROJECT_UNSUPPORTED_MESSAGE,
		}),
		loadProjectFile: async () => ({
			success: false,
			canceled: true,
			message: PROJECT_UNSUPPORTED_MESSAGE,
		}),
		loadCurrentProjectFile: async () => ({
			success: false,
			message: PROJECT_UNSUPPORTED_MESSAGE,
		}),
		onMenuLoadProject: () => () => {},
		onMenuSaveProject: () => () => {},
		onMenuSaveProjectAs: () => () => {},
		getPlatform: async () => detectPlatform(),
		revealInFolder: async () => ({
			success: false,
			message: "Reveal in folder is not available in web mode.",
		}),
		getShortcuts: async () => safeLocalStorageGet<Record<string, unknown>>(SHORTCUTS_STORAGE_KEY),
		saveShortcuts: async (shortcuts: unknown) => {
			safeLocalStorageSet(SHORTCUTS_STORAGE_KEY, shortcuts);
			return { success: true };
		},
		hudOverlayHide: () => {},
		hudOverlayClose: () => {},
		showCountdownOverlay: async () => {},
		setCountdownOverlayValue: async () => {},
		hideCountdownOverlay: async () => {},
		onCountdownOverlayValue: () => () => {},
		setMicrophoneExpanded: () => {},
		setHasUnsavedChanges: () => {},
		onRequestSaveBeforeClose: () => () => {},
		setLocale: async () => {},
	};
}

export function installWebElectronApiShim(): void {
	if (typeof window === "undefined") return;
	if (window.electronAPI) return;
	window.electronAPI = createWebElectronApi();
}
