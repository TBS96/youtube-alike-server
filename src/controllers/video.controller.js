import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose, { isValidObjectId } from "mongoose";




const publishAVideo = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to publish a video. (take video and upload) **
    1. get title and description of video from client(req.body)
    2. validation - not empty
    3. check for video file path and thumbnail file path from multer
    4. upload video and thumbnail to cloudinary
    5. create video document in DB
    6. final check, whether video has been uploaded
    7. return success response
    8. CLEANUP: we delete any uploaded assets so we don't have "ghost" files in cloudinary and throw API error 500
    */


    // ============== 1. get title and description of video from client(req.body) ==============
    const { title, description } = req.body;
    console.log(`Video title: ${title}; Video description: ${description}`);
    // ============== 1. get title and description of video from client(req.body) ==============


    // ================== 2. validation - not empty ==================
    if ([title, description].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'Video title and description fields are required');
    }
    // ================== 2. validation - not empty ==================


    // ================= 3. check for video file path and thumbnail file path from multer =================
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    console.log('thumbnail local path: ', thumbnailLocalPath);
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    console.log('video local path: ', videoFileLocalPath);

    if (!thumbnailLocalPath || !videoFileLocalPath) {
        throw new ApiError(400, 'Thumbnail and Video files are required');
    }
    // ================= 3. check for video file path and thumbnail file path from multer =================


    // ================= 4. upload video and thumbnail to cloudinary =================
    // const thumbnail = thumbnailLocalPath ? await uploadOnCloudinary(thumbnailLocalPath) : null;
    // console.log('thumbnail upload: ', thumbnail);
    // const videoFile = videoFileLocalPath ? await uploadOnCloudinary(videoFileLocalPath) : null;
    // console.log('video file upload: ', videoFile);

    let thumbnail, videoFile;

    try {
        [thumbnail, videoFile] = await Promise.all([
            uploadOnCloudinary(thumbnailLocalPath),
            uploadOnCloudinary(videoFileLocalPath)
        ]);

        console.log('thumbnail upload: ', thumbnail);
        console.log('video file upload: ', videoFile);
        
        if (!thumbnail) {
            throw new ApiError(400, 'Thumbnail is required');
        }
    
        if (!videoFile) {
            throw new ApiError(400, 'Video file is required');
        }
    
        // ================= 4. upload video and thumbnail to cloudinary =================
    
    
        // ============= 5. create video document in DB =============
        const video = await Video.create({
            thumbnail: thumbnail?.url,
            thumbnailPublicId: thumbnail?.public_id || '',
            videoFile: videoFile?.url,
            videoFilePublicId: videoFile?.public_id || '',
            title,
            description,
            duration: videoFile?.duration,
            isPublished: true,
            owner: req.user?._id,
        });
        // ============= 5. create video document in DB =============

        
        // ================= 6. final check, whether video has been uploaded =================
        if (!video) {
            throw new ApiError(500, 'Internal server error while creating video record');
        }
        // ================= 6. final check, whether video has been uploaded =================
    
    
        // ============= 7. return success response =============
        return res
        .status(201)
        .json(
            new ApiResponse(201, video, 'Video published successfully')
        )
        // ============= 7. return success response =============
    }
    catch (error) {
        // 8. CLEANUP: we delete any uploaded assets so we don't have "ghost" files in cloudinary
        if (thumbnail?.public_id) {
            await deleteFromCloudinary(thumbnail?.public_id, 'image');
        }
        
        if (videoFile?.public_id) {
            await deleteFromCloudinary(videoFile?.public_id, 'video');
        }
        
        throw new ApiError(500, error?.message || 'Something went wrong while publishing the video');
        // 8. CLEANUP: we delete any uploaded assets so we don't have "ghost" files in cloudinary and throw API error 500
    }
});



const getVideoById = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to get a video by its ID **
    1. extract the videoId from req.params
    2. validate that videoId is a valid MongoDB ObjectId to prevent BSON errors
    3. increment and update view count of the video in DB
    4. check if user is logged in add the video to the watchHistory[] of user collection
    5. start an aggregation pipeline on the Video collection matching the videoId
    6. join with the users collection to fetch uploader (owner) details
    7. join with the likes collection to fetch all documents associated with this video
    8. reshape the data: flatten the owner array, count total likes, and check if the current user has liked the video
    9. use projection to remove unnecessary raw data (the likes array) before sending the response
    10. verify that the video exists in the aggregation results
    11. return the final video object with a success response
*/

    // ============== 1. extract the videoId from req.params ==============
    const { videoId } = req.params;
    console.log(`VideoId from req.params: ${videoId}`);
    // ============== 1. extract the videoId from req.params ==============


    // ========== 2. check if videoId is a valid MongoDB ID (automatically handles empty/undefined/junk strings) ==========
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'The provided video ID is invalid or missing');
    }
    // ========== 2. check if it's a valid MongoDB ID (automatically handles empty/undefined/junk strings) ==========


    // ========== 3. increment and update view count of the video in DB ==========
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });
    // ========== 3. increment and update view count of the video in DB ==========


    // ========== 4. check if user is logged in add the video to the watchHistory[] of user collection ==========
    if (req.user?._id) {
        await User.findByIdAndUpdate(req.user?._id, {
            $addToSet: {
                watchHistory: mongoose.Types.ObjectId.createFromHexString(videoId)
            }
        });
    }
    // ========== 4. check if user is logged in add the video to the watchHistory[] of user collection ==========
    


    // Aggregate Pipeline logic: 4,5,6,7,8
    const video = await Video.aggregate([
        // ============= 5. match the videoId =============
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(videoId)
            }
        },
        // ============= 5. match the videoId =============

        // ======== 6. join with the users collection to fetch uploader (owner) details ========
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        // ======== 6. join with the users collection to fetch uploader (owner) details ========
        
        // ======== 7. join with the likes collection to fetch all documents associated with this video ========
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes'
            }
        },
        // ======== 7. join with the likes collection to fetch all documents associated with this video ========
        
        // ======== 8. reshape the data: flatten the owner array, count total likes, and check if the current user has liked the video ========
        {
            $addFields: {
                owner: {
                    $first: '$owner'
                },
                likesCount: {
                    $size: '$likes'
                },
                isLiked: {
                    $cond: {
                        if: { $in: [mongoose.Types.ObjectId.createFromHexString(String(req.user?._id)), '$likes.likedBy'] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // ======== 8. reshape the data: flatten the owner array, count total likes, and check if the current user has liked the video ========
        
        // ======== 9. use projection to remove unnecessary raw data (the likes array) before sending the response ========
        {
            $project: {
                likes: 0
            }
        }
        // ======== 9. use projection to remove unnecessary raw data (the likes array) before sending the response ========
    ]);

    // =========== 10. verify that the video exists in the aggregation results ===========
    if (!video?.length) {
        throw new ApiError(404, 'Video does not exist');
    }
    
    console.log('Video array after aggregation: ', video);
    // =========== 10. verify that the video exists in the aggregation results ===========

    // if (!video.isPublished && String(video.owner?._id) !== String(req.user?._id)) {
    //     throw new ApiError(403, 'This video is private');
    // }

    // ========== 11. return the final video object with a success response ==========
    return res
    .status(200)
    .json(
        new ApiResponse(200, video[0], 'Video details fetched successfully')
    );
    // ========== 11. return the final video object with a success response ==========
});



const updateVideo = asyncHandler(async (req, res) => {
    /* ** algorithm to follow step by step, to update Video **
    1. extract videoId from req.params and validate it
    2. extract title, description from req.body and validate them
    3. fetch video by id and check whether video is present
    4. check whether the requester is the owner of the video or not
    5. thumbnail update (optional choice for users)
    6. update Video collection in db
    7. return success response
    */
    
    // ================== 1. extract videoId from req.params and validate it ==================
    const { videoId } = req.params;
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'The provided video ID is invalid or missing');
    }
    
    console.log(`Video ID: ${videoId}`);
    // ================== 1. extract videoId from req.params and validate it ==================


    // ================== 2. extract title, description from req.body and validate them ==================
    const { title, description } = req.body;
    
    if ([title, description].some(field => field?.trim() === '')) {
        throw new ApiError(400, 'Video title and description fields are required');
    }

    console.log(`Updated title: ${title} ; Updated description: ${description}`);
    // ================== 2. extract title, description from req.body and validate them ==================

    
    // =========== 3. fetch video by id and check whether video is present ===========
    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new ApiError(404, 'Video file not found');
    }

    console.log('Fetched Video: ', video);
    // =========== 3. fetch video by id and check whether video is present ===========


    // ======== 4. check whether the requester is the owner of the video or not ========
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, 'Unauthorized request! You do not own this video');
    }
    // ======== 4. check whether the requester is the owner of the video or not ========


    // ========= 5. thumbnail update (optional choice for users) =========
    const thumbnailLocalPath = req.file?.path;
    console.log(`thumbnailLocalPath: ${thumbnailLocalPath}`);

    let newThumbnail;

    // if no thumbnail is uploaded then it will skip to updating the db with title and description
    if (thumbnailLocalPath) {
        newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if (!newThumbnail) {
            throw new ApiError(500, 'Falied to upload thumbnail on cloudinary');
        }

        console.log('New thumbnail: ', newThumbnail);

        if (video.thumbnailPublicId) {
            await deleteFromCloudinary(video.thumbnailPublicId);
        }
    }
    // ========= 5. thumbnail update (optional choice for users) =========


    // ============= 6. update Video collection in db =============
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnail?.url || video.thumbnail,
                thumbnailPublicId: newThumbnail?.public_id || video.thumbnailPublicId
            }
        },
        {
            new: true
        }
    );
    // ============= 6. update Video collection in db =============


    // ============== 7. return success response ==============
    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedVideo, 'Video updated successfully')
    )
    // ============== 7. return success response ==============
});

export {
    publishAVideo,
    getVideoById,
    updateVideo,
}