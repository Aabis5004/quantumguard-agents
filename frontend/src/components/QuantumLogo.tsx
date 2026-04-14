export default function QuantumLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="qg-grad" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <path d="M32 4 L56 14 V34 C56 48 46 56 32 60 C18 56 8 48 8 34 V14 Z" fill="url(#qg-grad)" opacity="0.15"/>
      <path d="M32 4 L56 14 V34 C56 48 46 56 32 60 C18 56 8 48 8 34 V14 Z" stroke="url(#qg-grad)" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="32" r="10" fill="url(#qg-grad)"/>
      <circle cx="32" cy="32" r="4" fill="#0A0E1A"/>
    </svg>
  );
}
