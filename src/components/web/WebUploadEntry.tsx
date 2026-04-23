import { Upload, Video } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface WebUploadEntryProps {
	onVideoReady: () => void;
}

export function WebUploadEntry({ onVideoReady }: WebUploadEntryProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const handleFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.currentTarget.value = "";
		if (!file) {
			return;
		}

		setIsLoading(true);
		const videoUrl = URL.createObjectURL(file);
		try {
			const result = await window.electronAPI.setCurrentVideoPath(videoUrl);
			if (!result.success) {
				URL.revokeObjectURL(videoUrl);
				toast.error("Failed to load video.");
				return;
			}
			onVideoReady();
		} catch (error) {
			URL.revokeObjectURL(videoUrl);
			toast.error(`Failed to load video: ${String(error)}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full h-full bg-[#09090b] text-slate-200 flex items-center justify-center p-8">
			<div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl">
				<div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-[#34B27B]/15 text-[#34B27B] flex items-center justify-center">
					<Video className="h-6 w-6" />
				</div>
				<h1 className="text-xl font-semibold text-white">Open a Video to Start Editing</h1>
				<p className="mt-2 text-sm text-slate-400">
					Choose a local video file and continue in the existing editor.
				</p>

				<div className="mt-6">
					<Button
						type="button"
						size="lg"
						disabled={isLoading}
						onClick={() => fileInputRef.current?.click()}
						className="w-full py-6 text-sm font-semibold bg-[#34B27B] text-white hover:bg-[#34B27B]/90"
					>
						<Upload className="mr-2 h-4 w-4" />
						{isLoading ? "Preparing video..." : "Upload Video"}
					</Button>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept=".webm,.mp4,.mov,.avi,.mkv,video/*"
					className="hidden"
					onChange={handleFilePick}
				/>
			</div>
		</div>
	);
}
