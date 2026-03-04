export interface ClassesTable {
  class_id: string;
  code: string;
  name: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface SubjectsTable {
  subject_id: string;
  name: string;
  code: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface LocalStudentsTable {
  id: number;
  student_id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface TeachersTable {
  teacher_id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface ClassSubjectsTable {
  class_subject_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  student_id: string;
  created_at: Date;
  updated_at: Date | null;
}
