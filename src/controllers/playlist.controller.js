import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { Playlist } from '../models/playlist.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'




const createPlaylist = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to toggle subscription by channel ID **
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


export {
    createPlaylist,
}