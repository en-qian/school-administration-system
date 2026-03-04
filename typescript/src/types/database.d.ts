import * as DatabaseTables from './database-table';

export interface MainDatabase {
  classes: DatabaseTables.ClassesTable;
  subjects: DatabaseTables.SubjectsTable;
  local_students: DatabaseTables.LocalStudentsTable;
  teachers: DatabaseTables.TeachersTable;
  class_subjects: DatabaseTables.ClassSubjectsTable;
}

export default MainDatabase;
