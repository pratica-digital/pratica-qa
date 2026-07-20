import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from './MarkdownContent';

function render(content?: string | null) {
  return renderToStaticMarkup(<MarkdownContent content={content} />);
}

describe('MarkdownContent', () => {
  it('renders headings', () => {
    expect(render('## Objetivo')).toContain('<h2');
    expect(render('## Objetivo')).toContain('Objetivo</h2>');
  });

  it('renders ordered and unordered lists', () => {
    const html = render('* Primeiro\n* Segundo\n\n1. Um\n2. Dois');

    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html.match(/<li/g)).toHaveLength(4);
  });

  it('renders bold and italic text', () => {
    const html = render('Texto **forte** e *enfatizado*.');

    expect(html).toContain('<strong>forte</strong>');
    expect(html).toContain('<em>enfatizado</em>');
  });

  it('renders plain text normally', () => {
    expect(render('Texto sem formatação')).toContain('<p class="my-2 first:mt-0 last:mb-0">Texto sem formatação</p>');
  });

  it('separates paragraphs', () => {
    expect(render('Primeiro parágrafo.\n\nSegundo parágrafo.').match(/<p /g)).toHaveLength(2);
  });

  it('does not render raw HTML, scripts, event handlers, or unsafe links', () => {
    const html = render('<script>alert(1)</script>\n<img src=x onerror="alert(2)">\n[link](javascript:alert(3))');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
  });

  it('renders single line breaks', () => {
    expect(render('Linha um\nLinha dois')).toContain('Linha um<br/>\nLinha dois');
  });

  it('renders nothing for empty or null content', () => {
    expect(render('')).toBe('');
    expect(render('   ')).toBe('');
    expect(render(null)).toBe('');
  });
});
