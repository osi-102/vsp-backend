import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";



export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({message: "Unauthorized request"});
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("Decoded Token:", decodedToken);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        console.log("User:", user);
        if (!user) {
            return res.status(401).json({message: "Invalid access token"});
        }
        req.user = user;
        next();
    
    } catch (error) {
        new apiError(401,error?.message || "Invalid access token");
    }

})

// export const verifyJWT = asyncHandler(async (req, _, next) => {
//     try {
//         const token = req.cookies.accessToken || (req.headers.authorization && req.headers.authorization.replace("Bearer ", ""));
    
//         if (!token) {
//             console.log("No token found");
//             throw new apiError(401, "Unauthorized request");
//         }

//         console.log("Token:", token);
        
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//         console.log("Decoded Token:", decodedToken);

//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

//         if (!user) {
//             console.log("User not found");
//             throw new apiError(401, "Invalid access token");
//         }
    
//         // If everything is fine, proceed to the next middleware
//         next();
//     } catch (error) {
//         console.error("Error in verifyJWT middleware:", error);
//         throw new apiError(401, error?.message || "Invalid access token");
//     }
// });
