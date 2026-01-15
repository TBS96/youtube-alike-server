import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from '../controllers/subscription.controller.js';

const subscriptionRouter = Router();

subscriptionRouter.use(verifyJWT);

subscriptionRouter.route('/toggle-subscription/:channelId').post(toggleSubscription);
subscriptionRouter.route('/get-user-channel-subscribers/:channelId').get(getUserChannelSubscribers);
subscriptionRouter.route('/get-subscribed-channels/:subscriberId').get(getSubscribedChannels);

export default subscriptionRouter;