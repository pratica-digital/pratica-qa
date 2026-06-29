import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

type UploadedReleaseFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

type ExtractedSection = {
  title: string;
  present: boolean;
};

const releaseSections = [
  'Escopo',
  'Destaques da Versao',
  'Destaques',
  'Novas Funcionalidades',
  'Melhorias',
  'Correcoes de Bugs',
  'Correcoes',
  'Eventos e Auditoria',
  'Impacto Esperado',
  'Observacoes Tecnicas',
];

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .split(String.fromCharCode(0))
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Injectable()
export class ReleaseNotesExtractorService {
  async extract(file: UploadedReleaseFile) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Release Notes file is empty.');
    }

    const extension = this.getExtension(file.originalname);
    const text = normalizeText(await this.extractText(file.buffer, file.mimetype, extension));

    if (!text) {
      throw new BadRequestException('Could not extract text from Release Notes.');
    }

    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size ?? file.buffer.length,
      hash: this.hash(text),
      text,
      sections: this.detectSections(text),
    };
  }

  hash(text: string) {
    return createHash('sha256').update(normalizeText(text), 'utf8').digest('hex');
  }

  detectSections(text: string): ExtractedSection[] {
    const normalized = normalizeForSearch(text);

    return releaseSections.map((title) => ({
      title,
      present: normalized.includes(normalizeForSearch(title)),
    }));
  }

  private async extractText(buffer: Buffer, mimeType: string, extension: string) {
    if (mimeType === 'application/pdf' || extension === '.pdf') {
      const { PDFParse } = await import('pdf-parse');
      const pdfParser = new PDFParse({ data: buffer });
      try {
        const parsed = await pdfParser.getText();
        return typeof parsed === 'string' ? parsed : parsed.text ?? '';
      } finally {
        await pdfParser.destroy?.();
      }
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.docx'
    ) {
      const mammoth = await import('mammoth');
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    }

    return buffer.toString('utf8');
  }

  private getExtension(fileName: string) {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
  }
}
