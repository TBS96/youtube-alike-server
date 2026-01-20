import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { Playlist } from '../models/playlist.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose, { isValidObjectId } from 'mongoose';
import { Video } from '../models/video.model.js';




const createPlaylist = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to create playlist **
    1. extract name, description from req.body and validate them
    2. check if playlist already exists with same playlist name. if exists, throw error 409
    3. create playlist
    4. check if playlist is created, else throw error 500
    5. return success response
    */

    // ========== 1. extract name, description from req.body and validate them ==========
    const { name, description } = req.body;
    
    if ([name, description].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'Playlist name and description fields are required');
    }
    // ========== 1. extract name, description from req.body and validate them ==========

    
    // =========== 2. check if playlist already exists with same playlist name. if exists, throw error 409 ===========
    const existingPlaylist = await Playlist.findOne({
        name: name.trim(),
        owner: req.user?._id
    });
    
    if (existingPlaylist) {
        throw new ApiError(409, 'You already have a playlist with this name');
    }
    // =========== 2. check if playlist already exists with same playlist name. if exists, throw error 409 ===========

    
    // =========== 3. create playlist ===========
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        videos: [],
        owner: req.user?._id
    });
    // =========== 3. create playlist ===========
    
    
    // ========== 4. check if playlist is created, else throw error 500 ==========
    if (!playlist) {
        throw new ApiError(500, 'Something went wrong while creating the playlist');
    }
    // ========== 4. check if playlist is created, else throw error 500 ==========

    console.log('Playlist created: ', playlist);

    
    // =========== 5. return success response ===========
    return res
    .status(201)
    .json(
        new ApiResponse(201, playlist, 'Playlist created successfully')
    );
    // =========== 5. return success response ===========
});



const addVideoToPlaylist = asyncHandler(async (req, res) => {
	/* ** algorithm to follow step by step, to update playlist with playlistId and videoId, by adding videos **
    1. extract playlistId, videoId from req.params, validate them and throw 400 and 404 errors respectively if validation fails
    2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error
    3. verify that the video.isPublished is falsy and video.owner matches the currently logged-in user. if they dont match, throw a 403 error
    4. check if the videoId already exists in the playlist, then throw error 409
    5. update the playlist by adding video/s
    6. check whether video is added to playlist or not,  else throw error 500
    7. return success response
    */

	//  ========== 1. extract playlistId, videoId from req.params, validate them and throw 400 and 404 errors respectively if validation fails ==========
    const { playlistId, videoId } = req.params;
    
	if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
	}
    
	if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
	}
    
	const playlist = await Playlist.findById(playlistId);
	if (!playlist) {
        throw new ApiError(404, 'Playlist does not exist');
	}
    
	const video = await Video.findById(videoId);
	if (!video) {
        throw new ApiError(404, 'Video does not exist');
	}
    //  ========== 1. extract playlistId, videoId from req.params, validate them and throw 400 and 404 errors respectively if validation fails ==========

	
    // ======== 2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error ========
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to modify this playlist');
	}
    // ======== 2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error ========

	
    // ====== 3. verify that the video.isPublished is falsy and video.owner matches the currently logged-in user. if they dont match, throw a 403 error ======
    if (!video.isPublished && video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! This video is private and cannot be added to your playlist');
	}
    // ====== 3. verify that the video.isPublished is falsy and video.owner matches the currently logged-in user. if they dont match, throw a 403 error ======

	
    // ========== 4. check if the videoId already exists in the playlist, then throw error 409 ==========
    if (playlist?.videos?.includes(videoId)) {
        throw new ApiError(409, 'Video already exists in the playlist');
    }
    // ========== 4. check if the videoId already exists in the playlist, then throw error 409 ==========


    // ========= 5. update the playlist by adding video/s =========
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
		{
			$addToSet: {
                videos: videoId,
			},
		},
		{
            new: true,
		}
	);
    // ========= 5. update the playlist by adding video/s =========

	
    // ============ 6. check whether video is added to playlist or not,  else throw error 500 ============
    if (!updatedPlaylist) {
        throw new ApiError(500, 'Something went wrong while adding video/s to the playlist');
	}
    // ============ 6. check whether video is added to playlist or not,  else throw error 500 ============
    
	console.log('Updated playlist after adding video: ', updatedPlaylist);

    // ======== 7. return success response ========
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, `Added video: "${video?.title}" to playlist successfully`)
    );
    // ======== 7. return success response ========
});



const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to update playlist with playlistId and videoId, by deleting videos **
    1. extract playlistId, videoId from req.params, validate them and throw 400 error respectively and 404 error for playlistId if validation fails
    2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error
    3. update the playlist by deleting video/s using $pull operator (reaches inside this array(videos[]) and removes only this specific ID (videoId))
    4. check whether video is added to playlist or not,  else throw error 500
    5. return success response
    */

    // ===== 1. extract playlistId, videoId from req.params, validate them and throw 400 error respectively and 404 error for playlistId if validation fails =====
    const { playlistId, videoId } = req.params;
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
    }
    
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, 'Playlist does not exist');
    }
    // ===== 1. extract playlistId, videoId from req.params, validate them and throw 400 error respectively and 404 error for playlistId if validation fails =====

    
    // ========== 2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error ==========
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to modify this playlist');
    }
    // ========== 2. verify that the playlist.owner matches the currently logged-in user. if they dont match, throw a 403 error ==========


    // ============ 3. update the playlist by deleting video/s using $pull operator ============
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {    // $pull operator reaches inside this array(videos[]) and removes only this specific ID (videoId)
                videos: videoId
            }
        },
        {
            new: true
        }
    );
    // ============ 3. update the playlist by deleting video/s using $pull operator ============

    
    // ============= 4. check whether video is added to playlist or not,  else throw error 500 =============
    if (!updatedPlaylist) {
        throw new ApiError(500, 'Something went wrong while deleting video/s from the playlist');
    }
    // ============= 4. check whether video is added to playlist or not,  else throw error 500 =============

    console.log('Updated playlist after deleting video: ', updatedPlaylist);

    // =========== 5. return success response ===========
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, 'Deleted video from the playlist successfully')
    );
    // =========== 5. return success response ===========
});



const updatePlaylist = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to update playlist **
    1. extract playlistId from req.params, and name, description from req.body and validate them and throw error 400 respectively
    2. check whether playlist exists in DB by its ID else throw error 404
    3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403
    4. update the playlist
    5. if playlist update fails, throw error 500
    6. return success response
    */

    // ======== 1. extract playlistId from req.params, and name, description from req.body and validate them and throw error 400 respectively ========
    const { playlistId } = req.params;
    const { name, description } = req.body;
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }
    
    if ([name, description].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'Name and description fields are required');
    }
    // ======== 1. extract playlistId from req.params, and name, description from req.body and validate them and throw error 400 respectively ========

    
    // ============ 2. check whether playlist exists in DB by its ID else throw error 404 ============
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }
    // ============ 2. check whether playlist exists in DB by its ID else throw error 404 ============

    
    // ======== 3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403 ========
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to modify this playlist');
    }
    // ======== 3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403 ========

    
    // ======== 4. update the playlist ========
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name?.trim(),
                description: description?.trim()
            }
        },
        {
            new: true
        }
    );
    // ======== 4. update the playlist ========
    
    
    // ============ 5. if playlist update fails, throw error 500 ============
    if (!updatedPlaylist) {
        throw new ApiError(500, 'Something went wrong while updating name or description');
    }
    // ============ 5. if playlist update fails, throw error 500 ============
    
    console.log('Updated playlist: ', updatedPlaylist);

    // ========= 6. return success response =========
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, 'Playlist updated successfully')
    );
    // ========= 6. return success response =========
});



const deletePlaylist = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to delete playlist **
    1. extract playlistId from req.params, validate it and throw error 400
    2. check whether playlist exists in DB by its ID else throw error 404
    3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403
    4. delete the playlist
    5. return success response
    */

    // ========== 1. extract playlistId from req.params, validate it and throw error 400 ==========
    const { playlistId } = req.params;
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }
    // ========== 1. extract playlistId from req.params, validate it and throw error 400 ==========

    
    // ========== 2. check whether playlist exists in DB by its ID else throw error 404 ==========
    const playlist = await Playlist.findById(playlistId);
    
    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }
    // ========== 2. check whether playlist exists in DB by its ID else throw error 404 ==========

    
    // =========== 3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403 ===========
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized! You do not have permission to delete this playlist');
    }
    // =========== 3. if playlist exists, then check whether playlist.owner === req.user._id, if not then throw error 403 ===========

    
    // ========== 4. delete the playlist ==========
    await Playlist.findByIdAndDelete(playlistId);
    // ========== 4. delete the playlist ==========

    
    // ========= 5. return success response =========
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Playlist deleted successfully')
    );
    // ========= 5. return success response =========
});



const getPlaylistById = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get playlist by id **
    1. extract playlistId from req.params, validate it and throw error 400
    2. S1 ($match): filter the single document in the playlists collection whose primary _id matches the playlistId
    3. S2 ($lookup): join with the videos collection to populate the videos array. inside this lookup, use a nested pipeline to:
        - $match: filter only include videos where isPublished is true
        - $lookup: join(sub-lookup) with the users collection to find the owner of each specific video and project only the fullName, username, avatar of the video creator
        - $addFields: $first to flatten the owner array into an object
    4. S3 ($lookup): another join, but this time at the root level, with the users collection to get the details of the person who owns the playlist itself (playlist creator)
    5. S4 ($addFields): $first to convert the playlist owner result from an array into a single object (flatten)
    6. check the result of the aggregation `playlist`. if the array is empty, throw a 404 error
    7. return success response with 1st element of playlist aggregation result
    */

    // ========= 1. extract playlistId from req.params, validate it and throw error 400 =========
    const { playlistId } = req.params;
    
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }
    // ========= 1. extract playlistId from req.params, validate it and throw error 400 =========
    

    const playlist = await Playlist.aggregate([
        // ======= 2. S1 ($match): filter the single document in the playlists collection whose primary _id matches the playlistId =======
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(playlistId.toString())
            }
        },
        // ======= 2. S1 ($match): filter the single document in the playlists collection whose primary _id matches the playlistId =======
        
        // ======= 3. S2 ($lookup): join with the videos collection to populate the videos array. inside this lookup, use a nested pipeline to: =======
        {
            $lookup: {
                from: 'videos',
                localField: 'videos',
                foreignField: '_id',
                as: 'videos',
                pipeline: [
                    // ========= $match: filter only include videos where isPublished is true =========
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    // ========= $match: filter only include videos where isPublished is true =========
                    
                    // ======= $lookup: join(sub-lookup) with the users collection to find the owner of each specific video and project only the fullName, username, avatar of the video creator =======
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
                    // ======= $lookup: join(sub-lookup) with the users collection to find the owner of each specific video and project only the fullName, username, avatar of the video creator =======
                    
                    // ======= $addFields: $first to flatten the owner array into an object =======
                    {
                        $addFields: {
                            owner: {
                                $first: '$owner'
                            }
                        }
                    }
                    // ======= $addFields: $first to flatten the owner array into an object =======
                ]
            }
        },
        // ======= 3. S2 ($lookup): join with the videos collection to populate the videos array. inside this lookup, use a nested pipeline to: =======
        
        // ======= 4. S3 ($lookup): another join, but this time at the root level, with the users collection to get the details of the person who owns the playlist itself (playlist creator) =======
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
        // ======= 4. S3 ($lookup): another join, but this time at the root level, with the users collection to get the details of the person who owns the playlist itself (playlist creator) =======
        
        // ========== 5. S4 ($addFields): $first to convert the playlist owner result from an array into a single object (flatten) ==========
        {
            $addFields: {
                owner: {
                    $first: '$owner'
                }
            }
        }
        // ========== 5. S4 ($addFields): $first to convert the playlist owner result from an array into a single object (flatten) ==========
    ]);

    console.log('Get playlist: ', playlist);

    // ========= 6. check the result of the aggregation `playlist`. if the array is empty, throw a 404 error =========
    if (!playlist.length) {
        throw new ApiError(404, 'Playlist not found');
    }
    // ========= 6. check the result of the aggregation `playlist`. if the array is empty, throw a 404 error =========

    
    // ======= 7. return success response with 1st element of playlist aggregation result =======
    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist[0], 'Playlist fetched successfully')
    );
    // ======= 7. return success response with 1st element of playlist aggregation result =======
});



const getUserPlaylists = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get playlists of specific user by userId **
    1. extract userId from req.params, validate it and throw error 400
    2. S1 ($match): filter the playlists collection to find all documents where the owner field matches the provided userId
    3. S2 ($addFields): calculate UI-friendly metadata to:
        - $size on the videos array to create a videoCount field
        - $arrayElemAt to grab the very first video ID (index 0) from the array to act as a single thumbnailVideo ID
    4. S3 ($project): clean up the data and only pass through _id, name, description, videoCount, thumbnailVideo, and updatedAt
    5. S4 ($sort): sort the list so the most recently updated playlists appear first (updatedAt: -1)
    6. return success response with the playlists array
    */

    // ========== 1. extract userId from req.params, validate it and throw error 400 ==========
    const { userId } = req.params;
    
    if (!isValidObjectId(userId))  {
        throw new ApiError(400, 'Invalid user ID');
    }
    // ========== 1. extract userId from req.params, validate it and throw error 400 ==========

    
    const playlists = await Playlist.aggregate([
        // ======== 2. S1 ($match): filter the playlists collection to find all documents where the owner field matches the provided userId ========
        {
            $match: {
                owner: mongoose.Types.ObjectId.createFromHexString(userId)
            }
        },
        // ======== 2. S1 ($match): filter the playlists collection to find all documents where the owner field matches the provided userId ========
        
        // ========== 3. S2 ($addFields): calculate UI-friendly metadata to get: ==========
        {
            $addFields: {
                // ========== $size on the videos array to create a videoCount field ==========
                videoCount: {
                    $size: '$videos'
                },
                // ========== $size on the videos array to create a videoCount field ==========

                // ========== $arrayElemAt to grab the very first video ID (index 0) from the array to act as a single thumbnailVideo ID ==========
                thumbnailVideo: {
                    $arrayElemAt: ['$videos', 0]
                }
                // ========== $arrayElemAt to grab the very first video ID (index 0) from the array to act as a single thumbnailVideo ID ==========
            }
        },
        // ========== 3. S2 ($addFields): calculate UI-friendly metadata to get: ==========

        // ======= 4. S3 ($project): clean up the data and only pass through _id, name, description, videoCount, thumbnailVideo, and updatedAt =======
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                videoCount: 1,
                thumbnailVideo: 1,
                updatedAt: 1
            }
        },
        // ======= 4. S3 ($project): clean up the data and only pass through _id, name, description, videoCount, thumbnailVideo, and updatedAt =======
        
        // ============ 5. S4 ($sort): sort the list so the most recently updated playlists appear first (updatedAt: -1) ============
        {
            $sort: {
                updatedAt: -1
            }
        }
        // ============ 5. S4 ($sort): sort the list so the most recently updated playlists appear first (updatedAt: -1) ============
    ]);

    console.log('Logged in user playlists: ', playlists);

    // =========== 6. return success response with the playlists array ===========
    return res
    .status(200)
    .json(
        new ApiResponse(200, playlists, 'User playlists fetched successfully')
    );
    // =========== 6. return success response with the playlists array ===========
});


export {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists
}