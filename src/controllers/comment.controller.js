import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Comment } from '../models/comment.model.js'




const addComment = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to add a comment by video ID **
    1. extract videoId and content from req.params and req.body respectively and validate them
    2. if videoId and content present then create a comment in db with content, videoId and owner fields
    3. if there is no comment and user hits comment btn then return error 500
    4. return success response
    */

    // ========== 1. extract videoId and content from req.params and req.body respectively and validate them ==========
    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid or missing video ID');
    }
    
    if (!content || content.trim() === '') {
        throw new ApiError(400, 'Comment is required');
    }
    // ========== 1. extract videoId and content from req.params and req.body respectively and validate them ==========


    // ======== 2. if videoId and content present then create a comment in db with content, videoId and owner fields ========
    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    });
    
    console.log('Comment: ', comment);
    // ======== 2. if videoId and content present then create a comment in db with content, videoId and owner fields ========


    // ========== 3. if there is no comment and user hits comment btn then return error 500 ==========
    if (!comment) {
        throw new ApiError(500, 'Failed to add comment');
    }
    // ========== 3. if there is no comment and user hits comment btn then return error 500 ==========
    

    // ========== 4. return success response ==========
    return res
    .status(201)
    .json(
        new ApiResponse(201, comment, 'Comment created successfully')
    );
    // ========== 4. return success response ==========
});

export {
    addComment,
}