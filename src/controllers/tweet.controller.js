import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Tweet } from "../models/tweet.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { mongoose } from "mongoose";
// import { uploadOnCloudinary } from "../utils/fileUpload.js";

const createTweet = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { content } = req.body;

  if (!userId) {
    throw new apiError(400, "Cannot Recognise User");
  }
  if (!content) {
    throw new apiError(400, "Tweet Content Required");
  }

  const newTweet = await Tweet.create({
    content: content,
    owner: userId._id,
  });

  if (!newTweet) {
    throw new apiError(500, "Tweet Creation Failed");
  }

  return res
    .status(200)
    .json(new apiResponse(200, "Tweet Created Successfully", { newTweet }));
});

const getUserTweets = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const tweets = await Tweet.find({
//     owner: new mongoose.Types.ObjectId(userId),
//   });
//   if (!tweets) {
//     throw new apiError(404, "No Tweets Found");
//   }

//   const allTweets = await Tweet.aggregate([
//     {
//       $match: { owner: new mongoose.Types.ObjectId(userId) },
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "usertweets",
//       },
//     },
//     {
//       $unwind: "$usertweets",
//     },
//     {
//       $group: {
//         _id: null,
//         content: { $push: "$tweet" },
//         User: { $first: "$usertweets" },
//       },
//     },
//     {
//       $project: {
//         _id: 0,
//         content: 1,
//         User: {
//           fullName: 1,
//           avatar: 1,
//           email: 1,
//           username: 1,
//         },
//       },
//     },
//   ]);

//   return res
//     .status(200)
//     .json(new apiResponse(200, "User Tweets Found", { allTweets }));
const { page = 1, limit = 10, sortBy, sortType, userId } = req.query;
  const filter = userId ? { owner: userId } : {};
  const sort = sortBy ? { [sortBy]: sortType === "desc" ? -1 : 1 } : {};
  const tweets = await Tweet.find(filter)
    .skip((Number(page) - 1) * Number(limit))
    .limit(parseInt(limit))
    .sort(sort)
    .exec();
  if (!tweets) throw new apiError("Error in fetching tweets");
  return res
    .status(200)
    .json(new apiResponse(200, "All tweets fetched successfully", { Tweets: tweets }));
});

const getTweetById = asyncHandler(async (req, res) => {
    const {TweetId } = req.params;
    if (!TweetId) throw new apiError(400, "Tweet ID Required");
  
    const tweet = await Tweet.findOne({_id: TweetId});
    if (!tweet) throw new apiError(404, "Tweet Not Found");
  
    return res
    .status(200)
    .json(new apiResponse(200, "Tweet Found", { tweet }));
  });

  const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { tweet } = req.body;

    if(!tweetId){
      throw new apiError(400, "Tweet ID Required");
    }

    if(!tweet){
      throw new apiError(400, "Tweet Content Required");
    }

    const findTweet = await Tweet.findById(tweetId);
  if (!findTweet) {
    throw new apiError(404, "Tweet not found");
  }
//   console.log(req.user);
//   console.log(findTweet.owner.toString());
//   console.log(req.user._id);
  if (findTweet.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, "You are not authorized to update this tweet");
  }
  try {
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      { $set: { content: tweet } },
      { new: true }
    );
    if (!updatedTweet) {
      throw new apiError(
        500,
        "An error occurred while trying to update a tweet"
      );
    }
    return res
      .status(200)
      .json(
        new apiResponse(200, { updatedTweet }, "Tweet updated successfully")
      );
  } catch (error) {
    throw new apiError(500, "An error occurred while trying to update a tweet");
  }
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
  
  const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!tweetId) {
      throw new apiError(400, "Tweet ID Required");
    }
  
    const tweet = await Tweet.findByIdAndDelete(tweetId);
    if (!tweet) {
      throw new apiError(404, "Tweet Not Found");
    }
  
    return res
      .status(200)
      .json(new apiResponse(200, "Tweet Deleted Successfully", {}));
  });

export { createTweet, getUserTweets, getTweetById, updateTweet, deleteTweet};
