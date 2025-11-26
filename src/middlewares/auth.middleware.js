import conf from "../conf/conf.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';

export const verifyJWT = asyncHandler( async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
        console.log('Token', token);
    
        if (!token) {
            throw new ApiError(401, 'Unauthorized request');
        }
    
        const decodedToken = jwt.verify(token, conf.accessTokenSecret);
        // console.log('Decoded token', decodedToken);
    
        const user = await User.findById(decodedToken?._id).select('-password -refreshToken');
    
        if (!user) {
            // TODO: plan about frontend
            throw new ApiError(401, 'Invalid Access Token');
        }
    
        req.user = user;
        // console.log('req.user', req.user);
        next();
    }
    catch (error) {
        throw new ApiError(401, error?.message || 'Invalid Access Token');
    }
});





/* 
**NOTES:**
why logout uses custom verifyJWT middleware?
- to ensure only an authenticated user (with a valid accessToken) can perform a logout request.

why req.user is used in logout?
- because verifyJWT attaches the authenticated user to req.user, allowing logout to know exactly which user to update.
*/