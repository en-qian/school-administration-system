import '../dotenv-loader';
import { updateClassByClassCode } from '../services/class-service';

describe('Update class by class code', () => {
  it('should throw error on invalid class code', async () => {
    await expect(updateClassByClassCode('xxxx', 'new name')).rejects.toThrow(
      'Invalid class code'
    );
  });
});

describe('Update class by class code', () => {
  it('should update class name', async () => {
    await expect(
      updateClassByClassCode('P1-1', 'P1-1 Loyalty')
    ).resolves.toBeUndefined();
  });
});
