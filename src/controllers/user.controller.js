import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/fileUpload.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
//  res.status(200).json({
//   message: "User registered successfully",
//  });

const {fullname, email,username, password} = req.body;
console.log("email: ", email);

if(
    [fullname, email, username, password].some((field) =>
    field?.trim() === ""))
    {
        throw new apiError(400, "All fields are required");
    }

    const existingUser = User.findOne({
        $or: [{email}, {username}]
    })
    if(existingUser){
        throw new apiError(409, "User with this email or username already exists");
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverimageLocalPath = req.files?.coverimage[0]?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverimage = await uploadOnCloudinary(coverimageLocalPath);

    if(!avatar){
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

    const createdUser = await User.findById(User._id).select("-password -refreshToken");

    if(!createdUser){
        throw new apiError(500, "User registration failed");
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully")
    );



});

export { registerUser };
