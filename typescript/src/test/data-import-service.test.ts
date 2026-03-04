import '../dotenv-loader';
import { handleImportedData } from '../services/data-import-service';

describe('Handle Imported data', () => {
  it('should throw error on invalid email', async () => {
    await expect(
      handleImportedData([
        {
          teacherEmail: 'notEmailText',
          teacherName: '',
          studentEmail: 'notEmailText',
          studentName: 'Common Student 1',
          classCode: 'P1-3',
          classname: 'P1 Brave',
          subjectCode: 'CN',
          subjectName: 'Chinese',
          toDelete: '0',
        },
      ])
    ).rejects.toThrow();
  });
});
