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



// my followers
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
            `Subscribers of channel ${channel.fullName} fetched successfully`
        )
    );
    // ========== 8. return success response with subscribers array and its count ==========
});


// to whom i am following
const getSubscribedChannels = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get all channels a user is following by subscriber ID **
    1. extract the subscriberId from req.params and validate it
    2. verify that the subscriberId matches the currently logged-in user. if they dont match, throw a 403 error to keep the "Following" list private
    3. S1 ($match): filter the Subscription collection for documents where the subscriber field matches the provided subscriberId
    4. S2 ($lookup): join with the users collection to retrieve details (fullName, username, avatar) of the channel (the creator being followed)
    5. S3 ($addFields): use $first to convert the channel array (created by lookup) into a single object for a cleaner data structure
    6. S4 ($sort): sort the results by createdAt in desc order so that the most recently followed channels appear at the top
    7. S5 ($project): filter the final output to only include the channel details and the createdAt timestamp
    8. Send a success response including the list of channels and the total subscribedChannelsCount
    */

    // ========= 1. extract the subscriberId from req.params and validate it =========
    const { subscriberId } = req.params;
    
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, 'Invalid Subscriber ID');
    }
    
    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
        throw new ApiError(404, 'Subscriber does not exist');
    }
    // ========= 1. extract the subscriberId from req.params and validate it =========
    
    
    // 2. verify that the subscriberId matches the currently logged-in user. if they dont match, throw a 403 error to keep the "Following" list private
    if (subscriberId.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Unauthorized! You do not have permission to view another user's subscription list");
    }
    // 2. verify that the subscriberId matches the currently logged-in user. if they dont match, throw a 403 error to keep the "Following" list private

    const subscribedChannels = await Subscription.aggregate([
        // ========== 3. S1 ($match): filter the Subscription collection for documents where the subscriber field matches the provided subscriberId ==========
        {
            $match: {
                subscriber: mongoose.Types.ObjectId.createFromHexString(subscriberId)
            }
        },
        // ========== 3. S1 ($match): filter the Subscription collection for documents where the subscriber field matches the provided subscriberId ==========
        
        // ==== 4. S2 ($lookup): join with the users collection to retrieve details (fullName, username, avatar) of the channel (the creator being followed) ====
        {
            $lookup: {
                from: 'users',
                localField: 'channel',
                foreignField: '_id',
                as: 'channel',
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
        // ==== 4. S2 ($lookup): join with the users collection to retrieve details (fullName, username, avatar) of the channel (the creator being followed) ====

        // ========= 5. S3 ($addFields): use $first to convert the channel array (created by lookup) into a single object for a cleaner data structure =========
        {
            $addFields: {
                channel: {
                    $first: '$channel'
                }
            }
        },
        // ========= 5. S3 ($addFields): use $first to convert the channel array (created by lookup) into a single object for a cleaner data structure =========

        // ======= 6. S4 ($sort): sort the results by createdAt in desc order so that the most recently followed channels appear at the top =======
        {
            $sort: {
                createdAt: -1
            }
        },
        // ======= 6. S4 ($sort): sort the results by createdAt in desc order so that the most recently followed channels appear at the top =======
        
        // ========== 7. S5 ($project): filter the final output to only include the channel details and the createdAt timestamp ==========
        {
            $project: {
                channel: 1,
                createdAt: 1
            }
        }
        // ========== 7. S5 ($project): filter the final output to only include the channel details and the createdAt timestamp ==========
    ]);

    console.log('Subscribed channels: ', subscribedChannels);

    
    // ============= 8. Send a success response including the list of channels and the total subscribedChannelsCount =============
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                subscribedChannels,
                subscribedChannelsCount: subscribedChannels.length
            },
            `Subscribed channels of user: ${subscriber.fullName} fetched successfully`
        )
    );
    // ============= 8. Send a success response including the list of channels and the total subscribedChannelsCount =============
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}