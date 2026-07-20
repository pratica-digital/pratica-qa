import { resolveRuntimeUploadPath } from './runtime-upload-storage';

describe('runtime upload storage', () => {
  it('accepts only paths contained by the runtime upload directory', () => {
    expect(resolveRuntimeUploadPath('/uploads/project-images/image.png'))
      .toContain('uploads');
    expect(resolveRuntimeUploadPath('/api/projects')).toBeNull();
    expect(resolveRuntimeUploadPath('/uploads/../../secret.txt')).toBeNull();
  });
});
