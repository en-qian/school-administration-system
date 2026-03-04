import Express from 'express';
import { checkRole } from '../middleware.ts/role';
import { getWorkloadReport } from '../controllers/report-controller';

const reportRoute = Express.Router();

reportRoute.get('/workload', checkRole('admin'), getWorkloadReport);

export default reportRoute;
