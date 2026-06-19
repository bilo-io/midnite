import { describe, expect, it } from 'vitest';
import {
  REPORT_CONTENT_TYPE,
  ReportFormatSchema,
  isServerRenderedReportFormat,
} from './report.js';

describe('ReportFormatSchema', () => {
  it('accepts the two supported formats', () => {
    expect(ReportFormatSchema.parse('md')).toBe('md');
    expect(ReportFormatSchema.parse('pdf')).toBe('pdf');
  });

  it('rejects unknown formats', () => {
    expect(ReportFormatSchema.safeParse('docx').success).toBe(false);
  });
});

describe('isServerRenderedReportFormat', () => {
  it('marks md as server-rendered and pdf as client-rendered', () => {
    expect(isServerRenderedReportFormat('md')).toBe(true);
    expect(isServerRenderedReportFormat('pdf')).toBe(false);
  });
});

describe('REPORT_CONTENT_TYPE', () => {
  it('serves markdown as text/markdown', () => {
    expect(REPORT_CONTENT_TYPE.md).toContain('text/markdown');
  });
});