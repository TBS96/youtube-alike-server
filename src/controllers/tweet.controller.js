import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Tweet } from '../models/tweet.model.js'
import mongoose, { isValidObjectId } from 'mongoose';




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
        tweetId,
        {
            $set: {
                content: content
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



const deleteTweet = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to add a comment by video ID **
    1. extract tweetId from req.params and validate it
    2. find if the tweetId exists using findById else throw 404 error
    3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error
    4. delete tweetId using findByIdAndDelete
    5. return success response
    */

    // ========== 1. extract tweetId from req.params and validate it ==========
    const { tweetId } = req.params;
    
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, 'Invalid or missing tweet ID');
    }
    // ========== 1. extract tweetId from req.params and validate it ==========


    // ============= 2. find if the tweetId exists using findById else throw 404 error =============
    const tweet = await Tweet.findById(tweetId);
    
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found');
    }
    // ============= 2. find if the tweetId exists using findById else throw 404 error =============

    
    // ============ 3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error ============
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to delete this tweet!');
    }
    // ============ 3. check ownership of the tweeter using tweet.owner and req.user._id, else throw 403 error ============


    // ============== 4. delete tweetId using findByIdAndDelete ==============
    await Tweet.findByIdAndDelete(tweetId);
    // ============== 4. delete tweetId using findByIdAndDelete ==============

    
    // =========== 5. return success response ===========
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Tweet deleted successfully')
    );
    // =========== 5. return success response ===========
});



const getUserTweets = asyncHandler(async (req,res) => {
    /* ** algorithm to follow step by step, to fetch all tweets of a specific user **
    1. extract userId from req.params and validate it
    2. S1 ($match): filter the Tweet collection for documents where the owner matches the userId
    3. S2 ($lookup): join with the users collection to retrieve the creator's username, avatar, and fullName
    4. S3 ($lookup): join with the likes collection to fetch all like records associated with each tweet
    5. S4 ($addFields): format the output by:
        - extracting the first object from the owner array;
        - calculating the likesCount by measuring the size of the likes array;
        - determining isLiked by checking if the current req.user._id exists within the likes.likedBy array
    6. S5 ($sort): organize the result set by createdAt in descending order (-1) so the latest tweets appear first
    7. S6 ($project): remove the raw likes array from the final output to optimize the response payload
    8. return success response
    */
    
    // ========== 1. extract userId from req.params and validate it ==========
    const { userId } = req.params;
    
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid or missing user ID');
    }
    // ========== 1. extract userId from req.params and validate it ==========


    const tweets = await Tweet.aggregate([
        // ============= 2. S1 ($match): filter the Tweet collection for documents where the owner matches the userId =============
        {
            $match: {
                owner: mongoose.Types.ObjectId.createFromHexString(userId.toString())
            }
        },
        // ============= 2. S1 ($match): filter the Tweet collection for documents where the owner matches the userId =============

        // ========= 3. S2 ($lookup): Join with the users collection to retrieve the creator's username, avatar, and fullName =========
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        // ========= 3. S2 ($lookup): Join with the users collection to retrieve the creator's username, avatar, and fullName =========

        // =========== 4. S3 ($lookup): join with the likes collection to fetch all like records associated with each tweet ===========
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'tweet',
                as: 'likes'
            }
        },
        // =========== 4. S3 ($lookup): join with the likes collection to fetch all like records associated with each tweet ===========

        // ======= 5. S4 ($addFields): format the output by extracting the first owner object and calculating the likesCount via the $size operator =======
        {
            $addFields: {
                // extracting the first object from the owner array
                owner: {
                    $first: '$owner'
                },
                // extracting the first object from the owner array
                // calculating the likesCount by measuring the size of the likes array
                likesCount: {
                    $size: '$likes'
                },
                // calculating the likesCount by measuring the size of the likes array
                // determining isLiked by checking if the current req.user._id exists within the likes.likedBy array
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, '$likes.likedBy']},
                        then: true,
                        else: false
                    }
                }
                // determining isLiked by checking if the current req.user._id exists within the likes.likedBy array
            }
        },
        // ======= 5. S4 ($addFields): format the output by extracting the first owner object and calculating the likesCount via the $size operator =======

        // ========= 6. S5 ($sort): Organize the result set by createdAt in descending order (-1) so the latest tweets appear first =========
        {
            $sort: {
                createdAt: -1
            }
        },
        // ========= 6. S5 ($sort): Organize the result set by createdAt in descending order (-1) so the latest tweets appear first =========

        // ======== 7. S6 ($project): remove the raw likes array from the final output to optimize the response payload ========
        {
            $project: {
                likes: 0
            }
        }
        // ======== 7. S6 ($project): remove the raw likes array from the final output to optimize the response payload ========
    ]);

    console.log('Fetched tweets: ', tweets);


    // ============ 8. return success response ============
    return res
    .status(200)
    .json(
        new ApiResponse(200, tweets, 'All tweets fetched, successfully')
    );
    // ============ 8. return success response ============
});

export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets
}