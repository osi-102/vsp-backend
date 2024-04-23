import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { Aggregate } from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

 //   if (!user) {
 //     throw new apiError(404, "User not found");
 //   }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(500, "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //  res.status(200).json({
  //   message: "User registered successfully",
  //  });

  const { fullname, email, username, password } = req.body;
  console.log("email: ", email);

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new apiError(409, "User with this email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverimageLocalPath = req.files?.coverimage[0]?.path;

  let coverimageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverimage) &&
    req.files.coverimage.length > 0
  ) {
    coverimageLocalPath = req.files.coverimage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = await uploadOnCloudinary(coverimageLocalPath);

  if (!avatar) {
    throw new apiError(500, "Avatar upload failed, required");
  }

  User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
  });

  const createdUser = await User.findById(User._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    new apiError(500, "User registration failed");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req.body se data
  //username or email
  //password verify
  //token generate
  // cookie set

  const { username, email, password } = req.body;
  //console.log("request body:", req);
  console.log("username: ", username);

  if (!(username || email)) {
    new apiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    console.log("User not found",{username,email});
    new apiError(404, "User not found");
  }
  console.log("User found", user);

  const isPasswordMatch = await user.isPasswordCorrect(password);

  if (!isPasswordMatch) {
    console.log("Password not match",{email,username});
    throw new apiError(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});


const logoutUser = asyncHandler(async (req, res) => {
    //delete the refresh token from the database
    //clear the cookies
    //send response
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        { new: true }
    )
    const options = {
        httpOnly: true,
        secure: true,
      };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out successfully"));
});

const accessRefreshToken = asyncHandler(async (req, res) => {
    //get refresh token from the cookie
    //verify the refresh token
    //generate new access token
    //send response

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new apiError(401, "Unauthorized Request");
    }

    try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

      const user = await User.findById(decodedToken?._id);
      if(!user){
          throw new apiError(401, "Invalid refresh token");
      }

      if(incomingRefreshToken !== user?.refreshToken){
          throw new apiError(401, "Refresh token Expired");
      }

      const options = {
        httpOnly: true,
        secure: true,
      };

      const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);

      return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
          new apiResponse(
            200, 
            { accessToken, 
              refreshToken: newrefreshToken }, 
              "Token refreshed successfully"));
    } catch (error) {
        throw new apiError(401,error?.message || "Unauthorized Request");
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) =>{
    //get the user from the request object
    //get the current password from the request object
    //verify the current password
    //change the password
    //send response
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if(newPassword !== confirmPassword){
        throw new apiError(400, "Password does not match");
    }
    const user = await User.findById(req.user?._id);
    if(!user){
        throw new apiError(404, "User not found");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid current password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false});

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"))
});

const currentUser = asyncHandler(async (req, res) => {
    //get the user from the request object
    //send response
    return res
    .status(200)
    .json(200, req.user, "scurrent user found")
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email, username } = req.body;
  if(!fullname || !email || !username){
    throw new apiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(req.user._id, 
    {
      $set: {
        fullname,
        email,
        username
      }
    },
  {new: true})
  .select("-password -refreshToken");

  return res
  .status(200)
  .json(new apiResponse(200, user, "Account details updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {

  const CoverImageLocalPath = req.file?.path;
  if(!CoverImageLocalPath){
    throw new apiError(400, "coverimage is required");
  }
  const coverimage = await uploadOnCloudinary(CoverImageLocalPath);
  if(!coverimage.url){
    throw new apiError(500, "coverimage upload failed");
  }
  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        coverimage: coverimage.url
      }
    },
    {new: true}
  ).select("-password");

  return res
  .status(200)
  .json(new apiResponse(200, user, "Cover image updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarLocalPath = req.file?.path;
  if(!avatarLocalPath){
    throw new apiError(400, "Avatar is required");
  }
  //delete old avatar
  
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if(!avatar.url){
    throw new apiError(500, "Avatar upload failed");
  }
  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password");

  return res
  .status(200)
  .json(new apiResponse(200, user, "Avatar updated successfully"));
});

// const deleteOldAvatar =asyncHandler (async (req, res) => {
//   const user = await User.findById(req.user._id);
//   if(user.avatar){
//     const avatarId = user.avatar.split("/").pop();
//     await deleteFromCloudinary(avatarId);
//   }
//   return;
// });

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if(!username?.trim()){
    throw new apiError(400, "Username is required");
  }

  const channel = await Aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields:{
        subscriberCount: {
          $size: "$subscribers"
        },
        subscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond:{
            if:{$in: [req.user?.id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverimage: 1,
        subscriberCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        email: 1,

      }
    }
  ])
  console.log("channel", channel);
  if(!channel.length){
    throw new apiError(404, "Channel does not exist");
  }

  return res
  .status(200)
  .json(new apiResponse(200, channel[0], "Channel found successfully"));

});

export { 
  registerUser, 
  loginUser, 
  logoutUser, 
  accessRefreshToken, 
  currentUser, 
  changeCurrentPassword, 
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  deleteOldAvatar,
  getUserChannelProfile,
};
