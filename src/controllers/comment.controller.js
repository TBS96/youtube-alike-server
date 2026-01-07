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



const updateComment = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to add a comment by video ID **
    1. extract videoId and content from req.params and req.body respectively and validate them
    2. find if the commentId exists using findById else throw 404 error
    3. check ownership of the commenter using comment.owner and req.user._id, else throw 403 error
    4. update content of comment using findByIdAndUpdate
    5. return success response
    */

    // ======== 1. extract commentId and content from req.params and req.body respectively and validate them ========
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid or missing comment ID');
    }
    
    if (!content || content.trim() === '') {
        throw new ApiError('Content is required to update a comment');
    }
    // ======== 1. extract commentId and content from req.params and req.body respectively and validate them ========

    
    // =========== 2. find if the commentId exists using findById else throw 404 error ===========
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }
    // =========== 2. find if the commentId exists using findById else throw 404 error ===========

    
    // ======== 3. check ownership of the commenter using comment.owner and req.user._id, else throw 403 error ========
    if (comment.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to edit this comment!');
    }
    // ======== 3. check ownership of the commenter using comment.owner and req.user._id, else throw 403 error ========

    
    // ========= 4. update content of comment using findByIdAndUpdate =========
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    );
    // ========= 4. update content of comment using findByIdAndUpdate =========
    
    
    // ========== 4. return success response ==========
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedComment, 'Comment updated successfully')
    );
    // ========== 4. return success response ==========
});

export {
    addComment,
    updateComment,
}