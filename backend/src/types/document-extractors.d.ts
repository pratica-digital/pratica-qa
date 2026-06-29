declare module 'pdf-parse' {
  export interface PDFParseOptions {
    data: Buffer;
    verbosity?: number;
  }

  export interface PDFParseTextResult {
    text: string;
    pages: Array<{ text: string; num: number }>;
    total: number;
  }

  export class PDFParse {
    constructor(options: PDFParseOptions);
    getText(): Promise<string | PDFParseTextResult>;
    getPageText(pageNumber: number): Promise<string>;
    destroy(): Promise<void>;
  }

  export { PDFParse };
}

declare module 'mammoth' {
  export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
}
