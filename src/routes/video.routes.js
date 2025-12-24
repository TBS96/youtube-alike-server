import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { getAllVideos } from "../controllers/video.controller.js";

const videoRouter = Router();

videoRouter.use(verifyJWT);     // applied verifyJWT middleware to all routes in this file

videoRouter.route('/get-all-videos').get(getAllVideos);

export default videoRouter;