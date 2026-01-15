import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidObjectId } from 'mongoose';
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

export {
    toggleSubscription,
}