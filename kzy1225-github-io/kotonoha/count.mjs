const segmenter = new Intl.Segmenter('ja', {granularity: 'grapheme'});
export function analyze(text, mode = 'normal') {
  let total = 0;
  const cells = [];
  for (const {segment, index} of segmenter.segment(text)) {
    if (/^[\r\n]+$/.test(segment)) continue;
    const half = /^[\u0020-\u007e\uff61-\uff9f]+$/.test(segment);
    const weight = mode === 'weighted' && half ? 0.5 : 1;
    total += weight;
    cells.push({char: segment, start: index, end: index + segment.length, weight, total});
  }
  return {cells, total};
}
