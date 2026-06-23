export function Logo({ size = 36, showWordmark = true, className = '' }) {
  return (
    <span className={`site-logo ${className}`.trim()}>
      <img
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        className="site-logo-mark"
        aria-hidden="true"
      />
      {showWordmark ? (
        <span className="site-logo-text">
          UniHash <span className="text-fluor">$HASH</span>
        </span>
      ) : null}
    </span>
  );
}
