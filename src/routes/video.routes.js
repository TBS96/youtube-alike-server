import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { deleteVideo, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { upload } from '../middlewares/multer.middleware.js';

const videoRouter = Router();

videoRouter.use(verifyJWT);     // applied verifyJWT middleware to all routes in this file

// videoRouter.route('/get-all-videos').get(getAllVideos);
videoRouter.route('/publish-video').post(
    upload.fields([
        {
            name: 'videoFile',
            maxCount: 1
        },
        {
            name: 'thumbnail',
            maxCount: 1
        }
    ]),
    publishAVideo
);
videoRouter.route('/get-video-by-id/:videoId').get(getVideoById);
videoRouter.route('/update-video/:videoId').patch(upload.single('thumbnail'), updateVideo);
videoRouter.route('/delete-video/:videoId').delete(deleteVideo);
videoRouter.route('/get-videos').get(getAllVideos);
videoRouter.route('/toggle/publish/:videoId').patch(togglePublishStatus);

export default videoRouter;