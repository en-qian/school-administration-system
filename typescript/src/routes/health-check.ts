import Express from 'express';
import { healthcheckHandler } from '../controllers/health-check-controller';

const healthcheckRoute = Express.Router();

healthcheckRoute.get('/', healthcheckHandler);

export default healthcheckRoute;
