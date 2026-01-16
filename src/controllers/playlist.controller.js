import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { Playlist } from '../models/playlist.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { isValidObjectId } from 'mongoose';
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


export {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
}