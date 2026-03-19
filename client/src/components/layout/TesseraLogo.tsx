interface Props {
  className?: string;
}

// Four tiles — directly maps to the mosaic/tessera concept
export function TesseraLogo({ className = "w-6 h-6" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="1" width="9.5" height="9.5" rx="2" fill="currentColor" />
      <rect
        x="13.5"
        y="1"
        width="9.5"
        height="9.5"
        rx="2"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        x="1"
        y="13.5"
        width="9.5"
        height="9.5"
        rx="2"
        fill="currentColor"
        opacity="0.35"
      />
      <rect
        x="13.5"
        y="13.5"
        width="9.5"
        height="9.5"
        rx="2"
        fill="currentColor"
      />
    </svg>
  );
}
