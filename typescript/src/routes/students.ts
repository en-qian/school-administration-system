import Express from 'express';
import { checkRole } from '../middleware.ts/role';
import { getStudents } from '../controllers/students-controller';

const studentsRoute = Express.Router();

studentsRoute.get('/', checkRole('teacher'), getStudents);

export default studentsRoute;
