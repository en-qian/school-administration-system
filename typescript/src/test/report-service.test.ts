import '../dotenv-loader';
import { getTeacherClassesNumberCountBySubject } from '../services/report-service';

describe('get teacher classes number count by subject', () => {
  it('should return an object', async () => {
    await expect(
      getTeacherClassesNumberCountBySubject()
    ).resolves.toBeInstanceOf(Object);
  });
});
