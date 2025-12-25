import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import { Video } from '../models/video.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';




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
        const [thumbnail, videoFile] = await Promise.all([
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
            videoFile: videoFile?.url,
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
        .status(200)
        .json(
            new ApiResponse(200, video, 'Video published successfully')
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

export {
    publishAVideo,
}