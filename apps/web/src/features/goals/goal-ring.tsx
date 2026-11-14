/** Circular progress of a goal; the number in the middle is the percentage reached. */
export function GoalRing({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <svg
      className="goal-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${percent}% concluído`}
    >
      <circle
        className="goal-ring-track"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
      />
      <circle
        className="goal-ring-value"
        style={{ '--circumference': circumference } as React.CSSProperties}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  );
}
