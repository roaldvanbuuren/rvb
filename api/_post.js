// Front matter parsing and serialisation for content/writing/*.md
// (fields match src/content.config.ts).

export function parsePost(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = {};
  let body = text;
  if (m) {
    body = m[2].replace(/^\n+/, '');
    for (const line of m[1].split('\n')) {
      if (!line || /^\s*#/.test(line)) continue;
      const i = line.indexOf(':');
      if (i < 1) continue;
      const key = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (v.startsWith('"')) {
        try {
          v = JSON.parse(v);
        } catch {
          v = v.replace(/^"|"$/g, '');
        }
      } else if (v.startsWith("'") && v.endsWith("'")) {
        v = v.slice(1, -1).replace(/''/g, "'");
      }
      data[key] = v;
    }
  }
  return {
    title: data.title ?? '',
    date: data.date ? String(data.date).slice(0, 10) : '',
    summary: data.summary ?? '',
    cover: data.cover ?? '',
    originally_posted: data.originally_posted ?? '',
    draft: String(data.draft) === 'true',
    body,
  };
}

export function serialisePost(p) {
  const lines = [
    '---',
    `title: ${JSON.stringify(p.title)}`,
    `date: ${p.date}`,
    `summary: ${JSON.stringify(p.summary)}`,
  ];
  if (p.cover) lines.push(`cover: ${p.cover}`);
  if (p.originally_posted) lines.push(`originally_posted: ${p.originally_posted}`);
  lines.push(`draft: ${p.draft ? 'true' : 'false'}`, '---', '', p.body.replace(/\r\n/g, '\n').trim(), '');
  return lines.join('\n');
}
