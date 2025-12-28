import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getVideoById, publishAVideo } from "../controllers/video.controller.js";
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

export default videoRouter;