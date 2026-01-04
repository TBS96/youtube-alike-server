import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { toggleVideoLike } from '../controllers/like.controller.js';

const likeRouter = Router();

likeRouter.use(verifyJWT);

likeRouter.route('/toggle-video-like/:videoId').post(toggleVideoLike);

export default likeRouter;