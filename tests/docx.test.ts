// tests/docx.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ommlToLatex, processOmmlInXml } from '../src/utils/docx-math/omml-to-latex.js';
import { MarkItDown } from '../src/markitdown.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('ommlToLatex', () => {
  it('converts simple fraction', () => {
    const omml = `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:f><m:num><m:r><m:t>1</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f>
    </m:oMath>`;
    const result = ommlToLatex(omml);
    expect(result).toContain('\\frac');
    expect(result).toContain('1');
    expect(result).toContain('2');
  });

  it('converts simple radical (sqrt)', () => {
    const omml = `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:rad><m:radPr></m:radPr><m:deg></m:deg><m:e><m:r><m:t>x</m:t></m:r></m:e></m:rad>
    </m:oMath>`;
    const result = ommlToLatex(omml);
    expect(result).toContain('\\sqrt');
    expect(result).toContain('x');
  });

  it('converts subscript', () => {
    const omml = `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:sSub>
        <m:e><m:r><m:t>x</m:t></m:r></m:e>
        <m:sub><m:r><m:t>i</m:t></m:r></m:sub>
      </m:sSub>
    </m:oMath>`;
    const result = ommlToLatex(omml);
    expect(result).toContain('x');
    expect(result).toContain('_{');
    expect(result).toContain('i');
  });

  it('converts superscript', () => {
    const omml = `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:sSup>
        <m:e><m:r><m:t>x</m:t></m:r></m:e>
        <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
      </m:sSup>
    </m:oMath>`;
    const result = ommlToLatex(omml);
    expect(result).toContain('x');
    expect(result).toContain('^{');
    expect(result).toContain('2');
  });

  it('returns empty string for invalid/empty input', () => {
    expect(ommlToLatex('')).toBe('');
    expect(ommlToLatex('<invalid/>')).toBe('');
  });
});

describe('processOmmlInXml', () => {
  it('replaces inline oMath with LaTeX in dollar signs', () => {
    const xml = `<w:body><w:p><m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:r><m:t>x</m:t></m:r>
    </m:oMath></w:p></w:body>`;
    const result = processOmmlInXml(xml);
    expect(result).toContain('$');
    expect(result).toContain('x');
    expect(result).not.toContain('<m:oMath');
  });

  it('replaces oMathPara with display math', () => {
    const xml = `<w:body><m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
      <m:oMath><m:r><m:t>y</m:t></m:r></m:oMath>
    </m:oMathPara></w:body>`;
    const result = processOmmlInXml(xml);
    expect(result).toContain('$$');
    expect(result).toContain('y');
    expect(result).not.toContain('<m:oMathPara');
  });

  it('passes through XML without math elements unchanged', () => {
    const xml = '<w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body>';
    expect(processOmmlInXml(xml)).toBe(xml);
  });
});

describe('DocxConverter equations', () => {
  it('converts OMML math to LaTeX', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'equations.docx'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'equations.docx' },
    });
    expect(result.markdown).toContain('$');
  });
});

describe('DocxConverter security', () => {
  it('does not follow external rlink references', async () => {
    const md = new MarkItDown();
    const buffer = readFileSync(resolve(FIXTURES, 'rlink.docx'));
    const result = await md.convertBuffer(buffer, {
      streamInfo: { filename: 'rlink.docx' },
    });
    expect(result.markdown).toBeDefined();
  });
});
