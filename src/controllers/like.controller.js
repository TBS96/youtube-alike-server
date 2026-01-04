import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { Like } from '../models/like.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'




const toggleVideoLike = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to toggle like a video by its ID **
    1. extract the videoId from req.params and validate that videoId is a valid MongoDB ObjectId to prevent BSON errors
    2. search the Like collection to see if a document already exists for this specific item and this specific user (req.user._id)
    3. if like exists, delete it (unlike)
    4. if the like does not exist, create a new Like document (like)
    5. return success response
    */

    // ======== 1. extract the videoId from req.params and validate that videoId is a valid MongoDB ObjectId to prevent BSON errors ========
    const { videoId } = req.params;
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'The provided video ID is invalid or missing');
    }
    // ======== 1. extract the videoId from req.params and validate that videoId is a valid MongoDB ObjectId to prevent BSON errors ========


    // ========= 2. search the Like collection to see if a document already exists for this specific item and this specific user (req.user._id) =========
    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    });

    console.log('Existing video likes', existingLike);
    // 2. search the Like collection to see if a document already exists for this specific item and this specific user (req.user._id)


    // ========= 3. if like exists, delete it (unlike) =========
    if (existingLike) {
        await Like.findByIdAndDelete(existingLike?._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200, {isLiked: false}, 'Video unliked successfully')
        );
    }
    // ========= 3. if like exists, delete it (unlike) =========


    // ========= 4. if the like does not exist, create a new Like document (like) =========
    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    });
    // ========= 4. if the like does not exist, create a new Like document (like) =========


    // ============== 5. return success response ==============
    return res
    .status(200)
    .json(
        new ApiResponse(200, {isLiked: true}, 'Video liked successfully')
    );
    // ============== 5. return success response ==============
});

export {
    toggleVideoLike,
}