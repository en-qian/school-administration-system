import { NextFunction, Request, Response } from 'express';
import ErrorBase from '../errors/error-base';

type Role = 'admin' | 'teacher';

export const checkRole =
  (role: Role) => (req: Request, res: Response, next: NextFunction) => {
    const { user_role: userRole } = req.headers;

    try {
      if (userRole !== role) {
        throw new ErrorBase('UNAUTHORIZED_ACTION', 'Unauthorized Action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
