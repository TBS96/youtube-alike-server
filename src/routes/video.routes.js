import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { publishAVideo } from "../controllers/video.controller.js";
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

export default videoRouter;