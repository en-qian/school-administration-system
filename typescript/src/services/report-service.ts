import * as classSubjectModel from '../models/class-subjects';

export const getTeacherClassesNumberCountBySubject = async () => {
  const result = await classSubjectModel.getTeacherClassesList()();

  // Mapped the result to new format
  return result.reduce(
    (acc, row) => {
      acc[row.teacher_name] = row.subjects;
      return acc;
    },
    {} as Record<string, any[]>
  ) as {
    [key: string]: {
      subjectCode: string;
      subjectName: string;
      numberOfClasses: number;
    }[];
  };
};
