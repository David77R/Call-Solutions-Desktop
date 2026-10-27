import { useAnimatedNumber } from '../lib/useAnimatedNumber';

const SINGLE_PRICE = /^\$\s?(\d+(?:\.(\d+))?)$/;

function RollingPrice({ amount, decimals }) {
  const value = useAnimatedNumber(amount, 650);
  return <>${value.toFixed(decimals)}</>;
}

export default function AnimatedPrice({ display, className }) {
  const text = (display || '').trim();
  const match = text.match(SINGLE_PRICE);

  if (!text) {
    return <span className={className}>Por confirmar</span>;
  }

  if (!match) {
    return (
      <span className={`${className} is-text`} key={text}>
        {text}
      </span>
    );
  }

  return (
    <span className={className}>
      <RollingPrice amount={parseFloat(match[1])} decimals={match[2] ? match[2].length : 0} />
    </span>
  );
}
