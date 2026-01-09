import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Tweet } from '../models/tweet.model.js'
import { isValidObjectId } from 'mongoose';




const createTweet = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to add a tweet **
    1. extract content from req.body and validate it
    2. if content present then create a tweet in db with content, owner fields
    3. if there is no tweet and user hits tweet btn then return error 500
    4. return success response
    */

   // ========= 1. extract content from req.body and validate it =========
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
        throw new ApiError(400, 'Tweet content is required');
    }
    // ========= 1. extract content from req.body and validate it =========
    
    
    // ======== 2. if content present then create a tweet in db with content, owner fields ========
    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    });
    // ======== 2. if content present then create a tweet in db with content, owner fields ========

    
    // ============ 3. if there is no tweet and user hits tweet btn then return error 500 ============
    if (!tweet) {
        throw new ApiError(500, 'Failed to add tweet');
    }
    
    console.log('Tweet: ', tweet);
    // ============ 3. if there is no tweet and user hits tweet btn then return error 500 ============

    
    // ========= 4. return success response =========
    return res
    .status(201)
    .json(
        new ApiResponse(201, tweet, 'Tweet created successfully')
    );
    // ========= 4. return success response =========
});



const updateTweet = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to add a comment by video ID **
    1. extract tweetId and content from req.params and req.body respectively and validate them
    2. find if the tweetId exists using findById else throw 404 error
    3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error
    4. update content of tweet using findByIdAndUpdate
    5. return success response
    */

    // =========== 1. extract tweetId and content from req.params and req.body respectively and validate them ===========
    const { tweetId } = req.params;
    const { content } = req.body;
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, 'Invalid or missing tweet ID');
    }
    
    if (!content || content.trim() === '') {
        throw new ApiError(400, 'Content is required to update a tweet');
    }
    // =========== 1. extract tweetId and content from req.params and req.body respectively and validate them ===========

    
    // ============== 2. find if the tweetId exists using findById else throw 404 error ==============
    const tweet = await Tweet.findById(tweetId);
    
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found');
    }
    // ============== 2. find if the tweetId exists using findById else throw 404 error ==============

    
    // ============== 3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error ==============
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to edit this tweet!');
    }
    // ============== 3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error ==============

    
    // =========== 4. update content of tweet using findByIdAndUpdate ===========
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweet,
        {
            $set: {
                tweet: tweet
            }
        },
        {
            new: true
        }
    );
    // =========== 4. update content of tweet using findByIdAndUpdate ===========

    
    // ================= 5. return success response =================
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedTweet, 'Tweet updated successfully')
    );
    // ================= 5. return success response =================
});

export {
    createTweet,
    updateTweet,
}