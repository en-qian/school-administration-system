import * as classSubjectModel from '../models/class-subjects';
import axios from 'axios';
import Logger from '../config/logger';

const LOG = new Logger('students-service.js');

export const getStudentsByTeacherId = async (
  teacherId: string,
  query: {
    classCode: string;
    limit: number;
    offset: number;
  }
) => {
  const { classCode, limit, offset } = query;

  try {
    // Select class subject, count and get api response at once
    const [classSubjects, classSubjectsCount, response] = await Promise.all([
      classSubjectModel.getClassSubjects()({
        classCode,
        teacherId,
      }),
      classSubjectModel.getClassSubjectsCount()({ classCode, teacherId }),
      axios.get<{
        count: number;
        students: { id: number; name: string; email: string }[];
      }>(
        `${process.env.EXTERNAL_STUDENT_BASE_API_URL}/students?class=${classCode}&offset=0&limit=100`
      ),
    ]);

    // Merged database data and external api data
    const merged = [
      ...classSubjects.map(student => ({
        id: student.studentRunningId,
        name: student.studentName,
        email: student.studentEmail,
        isExternal: false,
      })),
      ...response.data.students.map(student => ({
        id: student.id,
        name: student.name,
        email: student.email,
        isExternal: true,
      })),
    ];

    // Sort students by id
    const students = merged
      .sort((a, b) => a.id - b.id)
      .slice(offset, offset + limit);

    return {
      count: classSubjectsCount + response.data.count,
      students,
    };
  } catch (error: any) {
    LOG.error(`${error}`);

    return { count: 0, students: [] };
  }
};
