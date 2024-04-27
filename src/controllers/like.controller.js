import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  
  if (!videoId) throw new apiError(400, "no such video");
  const user = req.user;
  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res
      .status(200)
      .json(new apiResponse(200, "Video unliked successfully"));
  }
  const like = await Like.create({
    video: videoId,
    likedBy: user._id,
  });
  return res
    .status(200)
    .json(new apiResponse(200, { like }, "Video liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new apiError(400, "no such comment");
  const user = req.user;
  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res
      .status(200)
      .json(new apiResponse(200, "comment unliked successfully"));
  }
  const like = await Like.create({
    comment: commentId,
    likedBy: user._id,
  });
  return res
    .status(200)
    .json(new apiResponse(200, { like }, "comment liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) throw new apiError(400, "no such video");
  const user = req.user;
  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res
      .status(200)
      .json(new apiResponse(200, "Tweet unliked successfully"));
  }
  const like = await Like.create({
    tweet: tweetId,
    likedBy: user._id,
  });
  return res
    .status(200)
    .json(new apiResponse(200, { like }, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videodetail",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "likedBy",
        foreignField: "_id",
        as: "userdetail",
      },
    },
    {
      $project: {
        video: 1,
        videodetail: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
        },
        userdetail: {
          _id: 1,
          username: 1,
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(new apiResponse(200, "Liked videos are", { likedVideos }));
});

export { 
    toggleCommentLike,
    toggleTweetLike, 
    toggleVideoLike, 
    getLikedVideos 
};