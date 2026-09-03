/**
 * The docs site's markdown renderer — deliberately a FORM renderer, not a markdown engine.
 *
 * The inputs are this repository's own gated documents (the component cards, support.md),
 * and `check-docs` holds them to a known shape. This module renders exactly the constructs
 * those documents use — headings, paragraphs, flat lists, tables, blockquotes, fences and
 * the inline marks — and nothing it has never seen. A full engine would accept anything
 * and render the mistakes too; this one turns an unknown construct into escaped text,
 * which a review then reads as the defect it is.
 *
 * Hooks: `link(href, text)` maps a document's relative address onto the site's routes (the
 * caller owns that law), and `code(source, lang)` paints fences — shiki at build time in
 * practice, so not one highlighter ships to the client.
 */

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** A heading's anchor id — the same slugging GitHub applies, for link stability. */
export const slug = (text) =>
  text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/**
 * Inline marks over ESCAPED text: code first (its content admits no further marks), then
 * links, bold, italics, strikethrough. The order is the grammar.
 */
export const renderInline = (raw, { link = (href) => href } = {}) => {
  let text = escapeHtml(raw);
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = link(href, label);
    return target === null
      ? label
      : `<a href="${escapeHtml(target)}">${label}</a>`;
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s(>])_([^_]+)_(?=[\s.,;:)!?]|$)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return text;
};

const isTableRow = (line) => /^\|.*\|\s*$/.test(line);
const isSeparatorRow = (line) => /^\|[\s:|-]+\|\s*$/.test(line);

const splitRow = (line) =>
  line
    .replace(/^\||\|\s*$/g, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll('\\|', '|'));

/**
 * Blocks, line by line. Hard-wrapped prose joins back into one paragraph — the sources
 * wrap at a column for review, and the page owns its own measure.
 */
export const renderMarkdown = async (markdown, options = {}) => {
  const { code = async (source) => `<pre>${escapeHtml(source)}</pre>` } =
    options;
  const inline = (text) => renderInline(text, options);
  const lines = markdown.split('\n');
  const out = [];

  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at];

    if (line.trim() === '') continue;

    const heading = line.match(/^(#{2,3}) (.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(
        `<h${level} id="${slug(heading[2])}">${inline(heading[2])}</h${level}>`,
      );
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'text';
      const source = [];
      at += 1;
      while (at < lines.length && !lines[at].startsWith('```')) {
        source.push(lines[at]);
        at += 1;
      }
      out.push(await code(source.join('\n'), lang));
      continue;
    }

    if (isTableRow(line)) {
      const raw = [];
      while (at < lines.length && isTableRow(lines[at])) {
        raw.push(lines[at]);
        at += 1;
      }
      at -= 1;
      // A header row of empty cells is the form's "this table needs no head" — it parses
      // like a separator, so the tell is a separator-shaped FIRST row.
      const headless = isSeparatorRow(raw[0]);
      const rows = raw.filter((r) => !isSeparatorRow(r)).map(splitRow);
      const head = headless ? null : rows.shift();
      const cells = (row, tag) =>
        row.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join('');
      out.push(
        '<div class="docs-table" tabindex="0" role="region" aria-label="Table"><table>' +
          (head ? `<thead><tr>${cells(head, 'th')}</tr></thead>` : '') +
          `<tbody>${rows.map((row) => `<tr>${cells(row, 'td')}</tr>`).join('')}</tbody>` +
          '</table></div>',
      );
      continue;
    }

    if (/^> /.test(line)) {
      const quoted = [];
      while (at < lines.length && /^>( |$)/.test(lines[at])) {
        quoted.push(lines[at].replace(/^> ?/, ''));
        at += 1;
      }
      at -= 1;
      out.push(
        `<blockquote>${await renderMarkdown(quoted.join('\n'), options)}</blockquote>`,
      );
      continue;
    }

    const listStart = line.match(/^(-|\d+\.) /);
    if (listStart) {
      const ordered = listStart[1] !== '-';
      const itemPattern = ordered ? /^\d+\. / : /^- /;
      const items = [];
      while (at < lines.length) {
        if (itemPattern.test(lines[at])) {
          items.push(lines[at].replace(itemPattern, ''));
        } else if (/^ {2,}\S/.test(lines[at]) && items.length) {
          items[items.length - 1] += ` ${lines[at].trim()}`;
        } else {
          break;
        }
        at += 1;
      }
      at -= 1;
      const tag = ordered ? 'ol' : 'ul';
      out.push(
        `<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`,
      );
      continue;
    }

    // Prose: join the hard-wrapped lines until the next block construct.
    const prose = [line];
    while (
      at + 1 < lines.length &&
      lines[at + 1].trim() !== '' &&
      !/^(#{2,3} |```|\||> |- |\d+\. )/.test(lines[at + 1])
    ) {
      prose.push(lines[at + 1]);
      at += 1;
    }
    out.push(`<p>${inline(prose.join(' '))}</p>`);
  }

  return out.join('\n');
};
