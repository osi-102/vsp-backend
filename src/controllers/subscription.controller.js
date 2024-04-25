// import { Video } from "../models/video.model.js";
// import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) throw new apiError(400, "Channel ID Required");

  const user = req.user;
  const alreadySubscribed = await Subscription.findOne({
    subscriber: user._id,
    channel: channelId,
  });

  if (alreadySubscribed) {
    const unsubscribe = await Subscription.deleteOne({
      subscriber: user._id,
      channel: channelId,
    });

    return res
      .status(200)
      .json(new apiResponse(200, "Unsubscribed Successfully", { unsubscribe }));
  }
  const subscribe = await Subscription.create({
    subscriber: user._id,
    channel: channelId,
  });
  return res
    .status(200)
    .json(new apiResponse(200, "Subscribed Successfully", { subscribe }));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) throw new apiError(400, "no subscriber ID found");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscribers",
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
        subscribers: { $push: "$subscribers.username" },
      },
    },
    {
      $project: {
        totalSubscribers: 1,
        subscribers: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, "Subscribers Found", { subscribers }));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  console.log(req.params);
  if (!channelId) throw new apiError(400, "No such channel");
  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channels",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        usernames: { $push: "$channels.username" },
      },
    },
    {
      $project: {
        total: 1,
        usernames: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(new apiResponse(200, "Channel fetched successfully", { channels }));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
