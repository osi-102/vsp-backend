// import mongoose, {isValidObjectId} from "mongoose"
import { Video } from "../models/video.model.js";
// import {User} from "../models/user.model.js"
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy, sortType, userId } = req.query;
  const filter = userId ? { owner: userId } : {};
  const sort = sortBy ? { [sortBy]: sortType === "desc" ? -1 : 1 } : {};
  const videos = await Video.find(filter)
    .skip((Number(page) - 1) * Number(limit))
    .limit(parseInt(limit))
    .sort(sort)
    .exec();
  if (!videos) throw new apiError("Error in fetching videos");
  return res
    .status(200)
    .json(new apiResponse(200, { videos }, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user;
  // console.log(userId);
  if (!userId) {
    throw new apiError(400, "Cannot Recognise User");
  }
  if (!title || !description) {
    throw new apiError(400, "Title and Description Required");
  }
  const videoFilePath = req.files?.videoFile[0]?.path;
  const thumbnailPath = req.files?.thumbnail[0]?.path;
  if (!videoFilePath || !thumbnailPath) {
    throw new apiError(400, "Cannot find video and thumbnail");
  }
  const videoFile = await uploadOnCloudinary(videoFilePath);
  const thumbnailUrl = await uploadOnCloudinary(thumbnailPath);
  const result = await Video.create({
    videoFile: videoFile?.url,
    thumbnail: thumbnailUrl?.url,
    title,
    description,
    duration: videoFile.duration,
    views: 0,
    isPublished: true,
    owner: userId._id,
  });
  return res
    .status(200)
    .json(new apiResponse(200, { result }, "Video Upload Success"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new apiError(400, "Video ID Required");

  const video = await Video.findById(videoId);
  if (!video) throw new apiError(404, "Video Not Found");

  return res.status(200).json(new apiResponse(200, { video }, "Video Found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  if (!videoId) throw new apiError(400, "Video ID not found");

  if (!(title || description)) {
    throw new apiError(400, "Title or Description Required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, "Video Not Found");
  }

  const thumbnailPath = req.file?.path;
  if (!thumbnailPath) {
    throw new apiError(400, "Thumbnail Required");
  }

  const newThumbnail = await uploadOnCloudinary(thumbnailPath);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: newThumbnail?.url,
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new apiError(500, "Error in updating video");
  }

  return res
    .status(200)
    .json(new apiResponse(200, { updatedVideo }, "Video Updated Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new apiError(400, "Video ID Required");
  }

  const video = await Video.findByIdAndDelete(videoId);
  if (!video) {
    throw new apiError(404, "Video Not Found");
  }

  return res
    .status(200)
    .json(new apiResponse(200, "Video Deleted Successfully", {}));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new apiError(400, "VideoId Field empty");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, "No Such Video");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new apiError(400, "Failed to update video");
  }

  return res
    .status(200)
    .json(new apiResponse(200, { updatedVideo }, "publish status toggled"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
