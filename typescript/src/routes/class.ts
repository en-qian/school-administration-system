import Express from 'express';
import { checkRole } from '../middleware.ts/role';
import { updateClass } from '../controllers/classes-controller';

const classRoute = Express.Router();

classRoute.put('/:classCode', checkRole('admin'), updateClass);

export default classRoute;
