import { describe, it, expect, vi, beforeEach } from "vitest";
import { HandleVideoAssetReadyUseCase, HandleVideoAssetReadyDTO } from "./HandleVideoAssetReadyUseCase";
import { IVideoRepository } from "@/core/domain/repositories/IVideoRepository";
import { IMediaStorageService } from "@/core/domain/services/IMediaStorageService";

describe("HandleVideoAssetReadyUseCase", () => {
  let mockVideoRepo: any;
  let mockMediaService: any;
  let useCase: HandleVideoAssetReadyUseCase;

  beforeEach(() => {
    // Create Mocks
    mockVideoRepo = {
      markAsReady: vi.fn().mockResolvedValue(undefined),
    };

    mockMediaService = {
      uploadFromUrl: vi.fn(),
    };

    // Inject Mocks
    useCase = new HandleVideoAssetReadyUseCase(
      mockVideoRepo as IVideoRepository,
      mockMediaService as IMediaStorageService
    );
  });

  it("should update the database and trigger media backup successfully", async () => {
    const requestData: HandleVideoAssetReadyDTO = {
      uploadId: "test_upload_id",
      playbackId: "test_playback_id",
      duration: 12.34,
      appUrl: "https://example.com",
    };

    await useCase.execute(requestData);

    // Assert: Video Repository was called with correct data
    expect(mockVideoRepo.markAsReady).toHaveBeenCalledWith(
      "test_upload_id",
      "test_playback_id",
      12.34
    );

    // Assert: Media Service was triggered correctly
    expect(mockMediaService.uploadFromUrl).toHaveBeenCalledWith(
      "https://stream.mux.com/test_playback_id/high.mp4",
      "pixelate-videos/test_playback_id",
      "https://example.com/api/webhooks/cloudinary"
    );
  });

  it("should throw an error if uploadId is missing", async () => {
    const requestData: HandleVideoAssetReadyDTO = {
      uploadId: "",
      playbackId: "test_playback_id",
      duration: 12.34,
      appUrl: "https://example.com",
    };

    await expect(useCase.execute(requestData)).rejects.toThrow("Missing uploadId");
  });
});
