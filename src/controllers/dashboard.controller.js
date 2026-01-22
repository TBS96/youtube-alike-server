import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose, { isValidObjectId } from 'mongoose';
import { Video } from '../models/video.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Like } from '../models/like.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';





const getChannelStats = asyncHandler(async (req, res) => {
	/* ** algorithm to follow step by step, to get channel statistics of loggedin user  by userId **
    1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively
    2. run parallel database queries using Promise.all to fetch video stats(totalVideos and views), subscriber count, and total likes
    3. inside videoStats aggregation, match by owner and group to sum up total videos and total views
    4. inside totalSubscribers aggregation, count total documents in subscription collection where channel matches userId
    5. inside totalLikes aggregation, lookup video details, unwind them, match by video owner, and count
    6. extract values safely from the returned arrays and provide defaults (0) for new channels
    7. return success response with allStats object
    */

	// ========== 1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively ==========
	const userId = req.user?._id;

	if (!userId) {
		throw new ApiError(401, 'Unauthenticated Unauthorized request!');
	}

	if (!isValidObjectId(userId)) {
		throw new ApiError(400, 'Invalid user ID');
	}
	// ========== 1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively ==========

	
    // ========= 2. run parallel database queries using Promise.all to fetch video stats(totalVideos and views), subscriber count, and total likes =========
    const [videoStats, totalSubscribers, totalLikes] = await Promise.all([
        // ========= 3. inside videoStats aggregation, match by owner and group to sum up total videos and total views =========
        Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
				},
			},
			{
                $group: {
                    _id: null,
					totalVideos: {
                        $sum: 1,
					},
					totalViews: {
                        $sum: '$views',
					},
				},
			},
		]),
        // ========= 3. inside videoStats aggregation, match by owner and group to sum up total videos and total views =========
        
		// ====== 4. inside totalSubscribers aggregation, count total documents in subscription collection where channel matches userId ======
        Subscription.countDocuments({
            channel: userId,
		}),
        // ====== 4. inside totalSubscribers aggregation, count total documents in subscription collection where channel matches userId ======
        
        // ========== 5. inside totalLikes aggregation, lookup video details, unwind them, match by video owner, and count ==========
		Like.aggregate([
            {
                $lookup: {
                    from: 'videos',
					localField: 'video',
					foreignField: '_id',
					as: 'videoDetails',
				},
			},
			{
                $unwind: '$videoDetails',
			},
			{
                $match: {
                    'videoDetails.owner': new mongoose.Types.ObjectId(userId),
				},
			},
			{
                $count: 'totalLikesCount',
			},
		])
        // ========== 5. inside totalLikes aggregation, lookup video details, unwind them, match by video owner, and count ==========
	]);
    // ========= 2. run parallel database queries using Promise.all to fetch video stats(totalVideos and views), subscriber count, and total likes =========
    
    console.log('Videostats: ', videoStats);
    console.log('----------------------');
    console.log('Total subscribers: ', totalSubscribers);
    console.log('----------------------');
    console.log('Total likes: ', totalLikes);
    console.log('----------------------');
    

    // ============= 6. extract values safely from the returned arrays and provide defaults (0) for new channels =============
	const allStats = {
        totalVideos: videoStats[0]?.totalVideos || 0,
		totalViews: videoStats[0]?.totalViews || 0,
		subscribers: totalSubscribers,
		totalLikes: totalLikes[0]?.totalLikesCount || 0,
	};
    // ============= 6. extract values safely from the returned arrays and provide defaults (0) for new channels =============

    console.log('Stats', allStats);

	
    // ============ 7. return success response with allStats object ============
    return res
	.status(200)
	.json(
        new ApiResponse(200, allStats, 'Channel stats fetched successfully')
	);
    // ============ 7. return success response with allStats object ============
});



const getChannelVideos = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get all videos uploaded by the loggedin user **
    1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively
    2. query the videos collection with .find() for all documents matching the owner ID and .sort() the results by creation date in desc order
    3. return success response with videos[]
    */

    // =========== 1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively ===========
    const userId = req.user?._id;

    if (!userId) {
		throw new ApiError(401, 'Unauthenticated Unauthorized request!');
	}

	if (!isValidObjectId(userId)) {
		throw new ApiError(400, 'Invalid user ID');
	}
    // =========== 1. extract userId from req.user?._id, validate it and throw 401 and 404 errors respectively ===========
    
    
    // ======= 2. query the videos collection with .find() for all documents matching the owner ID and .sort() the results by creation date in desc order =======
    const videos = await Video.find({ owner: userId }).sort({ createdAt: -1 });
    // ======= 2. query the videos collection with .find() for all documents matching the owner ID and .sort() the results by creation date in desc order =======
    
    console.log('Videos: ', videos);
    
    // ========= 3. return success response with videos[] =========
    return res
    .status(200)
    .json(
        new ApiResponse(200, videos, 'Channel videos fetched successfully')
    );
    // ========= 3. return success response with videos[] =========
});


export {
    getChannelStats,
    getChannelVideos
}