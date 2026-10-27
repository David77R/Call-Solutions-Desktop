const PRICE_SLOT = /""/g;
const SENTENCES = /[^.!?]+[.!?]*/g;

function splitQuestion(text) {
  const parts = (text.match(SENTENCES) || [text]).map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1];
  if (parts.length > 1 && /\?\s*$/.test(last)) {
    return { body: parts.slice(0, -1).join(' '), ask: last };
  }
  if (parts.length === 1 && /\?\s*$/.test(last)) return { body: '', ask: last };
  return { body: text, ask: null };
}

function withPriceSlots(text, lang) {
  const pieces = text.split(PRICE_SLOT);
  return pieces.flatMap((piece, i) =>
    i === pieces.length - 1
      ? [piece]
      : [
          piece,
          <mark key={i} className="flow-price">
            {lang === 'en' ? 'price' : 'precio'}
          </mark>,
        ]
  );
}

export default function AgentLine({ text, lang, plain = false }) {
  if (plain) return <>{withPriceSlots(text, lang)}</>;
  const { body, ask } = splitQuestion(text);
  return (
    <>
      {body && withPriceSlots(body, lang)}
      {body && ask ? ' ' : null}
      {ask && <strong className="flow-ask">{withPriceSlots(ask, lang)}</strong>}
    </>
  );
}
