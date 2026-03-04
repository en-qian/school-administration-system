import '../dotenv-loader';
import { getStudentsByTeacherId } from '../services/students-service';

describe('get students by teacher id', () => {
  it('should return an object', async () => {
    await expect(
      getStudentsByTeacherId('74VZn8lwkLemT35QJXSzc00cVlNrsMJCEcMcUlZh', {
        classCode: 'P1-1',
        limit: 10,
        offset: 0,
      })
    ).resolves.toBeInstanceOf(Object);
  });
});
