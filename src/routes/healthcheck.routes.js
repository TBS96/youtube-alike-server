import { Router } from 'express'
import { getHealthCheck } from '../controllers/healthcheck.controller.js';

const healthCheckRouter = Router();

healthCheckRouter.route('/').get(getHealthCheck);

export default healthCheckRouter;