import { asyncHandler } from '../utils/asyncHandler.js';
import mongoose, { isValidObjectId } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { Subscription } from '../models/subscription.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';




const toggleSubscription = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to toggle subscription by channel ID **
    1. extract the channelId from req.params and validate it
    2. check if channelId is equal to the userId. if so then throw 400 error
    3. search for a document in the Subscription collection where subscriber is the current user and channel is the channelId
    4. if document exists, delete it (unsubscribe) and return success response with isSubscribed: false
    5. if does not exist, create a new document (subscribe)
    6. if failed to create new document, throw error 500
    7. return success response with isSubscribed: true
    */
    
    // ========== 1. extract the channelId from req.params and validate it ==========
    const { channelId } = req.params;
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Invalid or missing channel ID');
    }

    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, 'Channel does not exist');
    }
    // ========== 1. extract the channelId from req.params and validate it ==========

    
    // ============== 2. check if channelId is equal to the userId. if so then throw 400 error ==============
    if (channelId.toString() === req.user?._id.toString()) {
        throw new ApiError(400, 'You cannot subscribe to your own channel');
    }
    // ============== 2. check if channelId is equal to the userId. if so then throw 400 error ==============

    
    
    // ========= 3. search for a document in the Subscription collection where subscriber is the current user and channel is the channelId =========
    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    });
    
    console.log('Existing subs: ', existingSubscription);
    // ========= 3. search for a document in the Subscription collection where subscriber is the current user and channel is the channelId =========

    
    // ========= 4. if document exists, delete it (unsubscribe) and return success response with isSubscribed: false =========
    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription?._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200, { isSubscribed: false }, 'Unsubscribed successfully')
        );
    }
    // ========= 4. if document exists, delete it (unsubscribe) and return success response with isSubscribed: false =========

    
    // =========== 5. if does not exist, create a new document (subscribe) ===========
    const newSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    });
    // =========== 5. if does not exist, create a new document (subscribe) ===========
    
    
    // =========== 6. if failed to create new document, throw error 500 ===========
    if (!newSubscription) {
        throw new ApiError(500, 'Something went wrong while subscribing');
    }
    // =========== 6. if failed to create new document, throw error 500 ===========

    
    // ========= 7. return success response with isSubscribed: true =========
    return res
    .status(200)
    .json(
        new ApiResponse(200, { isSubscribed: true }, 'Subscribed successfully')
    );
    // ========= 7. return success response with isSubscribed: true =========
});



const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get user channel subscribers by channel ID **
    1. extract the channelId from req.params and validate it
    2. keep subscribers(followers) list private, by checking whether channelId is not equal to the loggedin user. if matches then throw error 403. the loggedin user can only check his own subscribers list
    3. S1 ($match): filter the Subscription collection for documents where channel matches the channelId
    4. S2 ($lookup): join with the users collection to get the details of the subscriber (the person who followed)
    5. S3 ($addFields): use $first to convert the subscriber array from the lookup into a single object (flatten)
    6. S4 ($sort): sort to newest subscribers first (in desc order)
    7. S5 ($project): clean up the output to only show necessary subscriber fields (fullName, username, avatar)
    8. return success response with subscribers array and its count
    */

    // ============= 1. extract the channelId from req.params and validate it =============
    const { channelId } = req.params;
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Invalid channel ID');
    }
    
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, 'Channel does not exist');
    }
    // ============= 1. extract the channelId from req.params and validate it =============


    // ====== 2. keep subscribers(followers) list private, by checking channelId !== req.user?._id ======
    if (channelId.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! Only the channel owner can view their subscriber list');
    }
    // ====== 2. keep subscribers(followers) list private, by checking channelId !== req.user?._id ======
    
    
    const subscribers = await Subscription.aggregate([
        // ============= 3. filter the Subscription collection for documents where channel matches the channelId =============
        {
            $match: {
                channel: mongoose.Types.ObjectId.createFromHexString(channelId.toString())
            }
        },
        // ============= 3. filter the Subscription collection for documents where channel matches the channelId =============

        // ============= 4. S2 ($lookup): join with the users collection to get the details of the subscriber =============
        {
            $lookup: {
                from: 'users',
                localField: 'subscriber',
                foreignField: '_id',
                as:'subscriber',
                pipeline: [
                    {
                        $project:  {
                            fullName: 1,
                            username:1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        // ============= 4. S2 ($lookup): join with the users collection to get the details of the subscriber =============

        // =========== 5. S3 ($addFields): use $first to convert the subscriber array from the lookup into a single object (flatten) ===========
        {
            $addFields: {
                subscriber: {
                    $first: '$subscriber'
                }
            }
        },
        // =========== 5. S3 ($addFields): use $first to convert the subscriber array from the lookup into a single object (flatten) ===========

        // =========== 6. S4 ($sort): sort to newest subscribers first (in desc order) ===========
        {
            $sort: {
                createdAt: -1
            }
        },
        // =========== 6. S4 ($sort): sort to newest subscribers first (in desc order) ===========

        // ========== 7. S5 ($project): clean up the output to only show necessary subscriber fields (fullName, username, avatar) ==========
        {
            $project: {
                subscriber: 1,
                createdAt:1
            }
        }
        // ========== 7. S5 ($project): clean up the output to only show necessary subscriber fields (fullName, username, avatar) ==========
    ]);

    console.log('Subscribers aggregated and subscribers count: ', subscribers, subscribers.length);

    // ========== 8. return success response with subscribers array and its count ==========
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                subscribers,
                subscribersCount: subscribers.length
            },
            'Subscribers fetched successfully'
        )
    );
    // ========== 8. return success response with subscribers array and its count ==========
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
}