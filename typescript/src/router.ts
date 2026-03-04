import Express from 'express';
import dataImportRoute from './routes/data-import';
import classRoute from './routes/class';
import healthcheckRoute from './routes/health-check';
import reportRoute from './routes/reports';
import studentsRoute from './routes/students';

const router = Express.Router();

router.use('/class', classRoute);
router.use('/healthcheck', healthcheckRoute);
router.use('/reports', reportRoute);
router.use('/students', studentsRoute);
router.use('/upload', dataImportRoute);

export default router;
