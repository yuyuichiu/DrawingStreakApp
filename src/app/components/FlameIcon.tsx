export function FlameIcon({ size = 72, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 10 C50 10 20 40 20 65 C20 81.568 33.431 95 50 95 C66.568 95 80 81.568 80 65 C80 40 50 10 50 10Z"
        fill={lit ? "#FF9600" : "var(--muted)"}
      />
      <path
        d="M50 35 C50 35 32 55 32 70 C32 79.941 40.059 88 50 88 C59.941 88 68 79.941 68 70 C68 55 50 35 50 35Z"
        fill={lit ? "#FFC800" : "var(--secondary)"}
      />
      {lit && (
        <path
          d="M50 55 C50 55 40 68 40 76 C40 81.523 44.477 86 50 86 C55.523 86 60 81.523 60 76 C60 68 50 55 50 55Z"
          fill="#FFF066"
        />
      )}
    </svg>
  );
}
