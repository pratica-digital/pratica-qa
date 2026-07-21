import { TestResultStatus, TestRunStatus, UserRole, UserStatus } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TestResultsService } from './test-results.service';

describe('TestResultsService', () => {
  it('updates a result from a completed run and refreshes its execution status', async () => {
    const completedResult = {
      id: 'result-id',
      status: TestResultStatus.FAILED,
      testRunId: 'run-id',
      testRun: {
        assignedToId: 'qa-id',
        status: TestRunStatus.COMPLETED,
      },
    };
    const refreshedResult = {
      ...completedResult,
      status: TestResultStatus.PASSED,
      testRun: {
        ...completedResult.testRun,
        status: TestRunStatus.COMPLETED,
      },
    };
    const testResultsRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(completedResult)
        .mockResolvedValueOnce(refreshedResult),
      update: jest.fn().mockResolvedValue({
        id: 'result-id',
        status: TestResultStatus.PASSED,
        testRunId: 'run-id',
      }),
    };
    const testRunsRepository = {
      refreshExecutionStatus: jest.fn().mockResolvedValue({
        id: 'run-id',
        status: TestRunStatus.COMPLETED,
      }),
    };
    const shortcutFailureStoryService = {
      createForFailedResult: jest.fn().mockResolvedValue(null),
    };
    const service = new TestResultsService(
      testResultsRepository as never,
      testRunsRepository as never,
      {} as never,
      shortcutFailureStoryService as never,
      {} as never,
    );
    const user = {
      id: 'qa-id',
      email: 'qa@example.com',
      firstAccess: false,
      name: 'QA',
      passwordChangedAt: null,
      role: UserRole.QA,
      status: UserStatus.ACTIVE,
    };

    await expect(
      service.update('result-id', { status: TestResultStatus.PASSED }, user),
    ).resolves.toEqual(refreshedResult);
    expect(testResultsRepository.update).toHaveBeenCalledWith('result-id', {
      status: TestResultStatus.PASSED,
      executedById: 'qa-id',
      lastModifiedById: 'qa-id',
    });
    expect(testRunsRepository.refreshExecutionStatus).toHaveBeenCalledWith('run-id');
  });

  describe('getAttachmentPdfImage', () => {
    function setup(url = '/uploads/test-result-attachments/evidence.png') {
      const attachment = {
        id: 'attachment-id',
        fileName: 'stored.png',
        originalName: 'evidência pré-aquecimento.png',
        mimeType: 'image/png',
        testCaseId: 'case-id',
        url,
      };
      const testResultsRepository = {
        findAttachmentById: jest.fn().mockResolvedValue(attachment),
      };
      const pdfEvidenceImageService = {
        prepare: jest.fn().mockResolvedValue({
          buffer: Buffer.from('jpeg'),
          height: 600,
          mimeType: 'image/jpeg',
          width: 800,
        }),
      };
      const service = new TestResultsService(
        testResultsRepository as never,
        {} as never,
        {} as never,
        {} as never,
        pdfEvidenceImageService as never,
      );

      return { attachment, pdfEvidenceImageService, service };
    }

    it('resolves the local source and prepares the real attachment content', async () => {
      const fileName = `pdf-service-test-${Date.now()}.png`;
      const uploadDirectory = join(process.cwd(), 'uploads', 'test-result-attachments');
      const filePath = join(uploadDirectory, fileName);
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(filePath, Buffer.from('fixture'));

      try {
        const { attachment, pdfEvidenceImageService, service } = setup(
          `/uploads/test-result-attachments/${fileName}`,
        );

        await expect(service.getAttachmentPdfImage('attachment-id')).resolves.toMatchObject({
          attachment,
          image: { height: 600, mimeType: 'image/jpeg', width: 800 },
        });
        expect(pdfEvidenceImageService.prepare).toHaveBeenCalledWith(
          expect.stringContaining(fileName),
          'image/png',
        );
      } finally {
        await unlink(filePath);
      }
    });

    it('blocks path traversal and external attachment URLs', async () => {
      const { pdfEvidenceImageService, service } = setup('/uploads/../../secret.png');
      const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await expect(service.getAttachmentPdfImage('attachment-id')).rejects.toMatchObject({
        status: 404,
      });
      expect(pdfEvidenceImageService.prepare).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('testCaseId=case-id'));
      warning.mockRestore();
    });
  });
});
import { Logger } from '@nestjs/common';
