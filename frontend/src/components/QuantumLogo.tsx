export default function QuantumLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="arc-logo-grad" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#312285" />   {/* Deep purple/blue */}
          <stop offset="50%" stopColor="#55247A" />  {/* Violet */}
          <stop offset="100%" stopColor="#963c70" /> {/* Magenta */}
        </linearGradient>
      </defs>
      
      {/* Precision Traced Arc "A" Logo */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd"
        fill="url(#arc-logo-grad)" 
        d="M 5 100 L 27 100 Q 29 90 31 82 C 50 78 80 85 99 100 C 90 35 75 0 50 0 C 25 0 10 35 5 100 Z M 34 66 C 38 32 43 18 50 18 C 57 18 70 45 75 70 C 60 65 45 63 34 66 Z"
      />
    </svg>
  );
}
