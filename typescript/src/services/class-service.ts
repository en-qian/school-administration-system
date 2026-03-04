import ErrorBase from '../errors/error-base';
import * as classModel from '../models/classes';

export const updateClassByClassCode = async (
  classCode: string,
  className: string
) => {
  const targetClass = await classModel.getClassByClassCode()(classCode);

  if (!targetClass) {
    throw new ErrorBase('INVALID_REQUEST', 'Invalid class code');
  }

  await classModel.updateClass()(targetClass.classId, { name: className });
};
