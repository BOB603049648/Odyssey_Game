type Props = { id: string; className?: string };

export function Glyph({ id, className }: Props) {
  return (
    <svg className={className ? `glyph ${className}` : 'glyph'} viewBox="0 0 64 64" aria-hidden="true">
      <GlyphShape id={id} />
    </svg>
  );
}

function GlyphShape({ id }: { id: string }) {
  switch (id) {
    case 'myp.word.sun':
      return (
        <>
          <circle cx="32" cy="32" r="9" />
          <path d="M32 8v8M32 48v8M8 32h8M48 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" />
        </>
      );
    case 'myp.word.moon':
      return <path d="M40 12a18 18 0 1 0 0 40 14 14 0 1 1 0-40z" />;
    case 'myp.word.water':
      return <path d="M8 26c6 0 6 8 12 8s6-8 12-8 6 8 12 8 6-8 12-8M8 40c6 0 6 8 12 8s6-8 12-8 6 8 12 8 6-8 12-8" />;
    case 'myp.word.fire':
      return <path d="M32 8c8 10 6 16 10 22 4 6 2 18-10 22-14-2-18-12-14-20 2-4 2-8 6-12-2 6 2 8 4 8-4-8-2-14 4-20z" />;
    case 'myp.word.fish':
      return <path d="M10 32c10-10 24-10 34 0-10 10-24 10-34 0zM44 32l12-8v16zM24 32h.1" />;
    case 'myp.word.person':
      return <path d="M32 14a6 6 0 1 0 .1 0M32 26v14M22 32h20M24 54l8-14 8 14" />;
    case 'myp.word.eat':
      return <path d="M14 36c8-8 16-8 22 0M36 28c6 2 10 8 10 14M40 18v8M32 54h16" />;
    case 'myp.word.drink':
      return <path d="M22 16h16l-2 14c8 2 10 10 4 16H24c-8-4-6-14 2-16zM40 24c8 2 10 8 8 12" />;
    case 'myp.word.sleep':
      return <path d="M10 40c8-8 16-8 24 0v8H10zM34 24h18M34 32h12M40 16a8 8 0 1 1 8 8" />;
    case 'myp.word.walk':
      return <path d="M18 50c4-14 6-14 8-22M30 50c2-12 6-16 10-22M16 18h8M34 16h10" />;
    case 'myp.word.give':
      return <path d="M8 36h16l8-8 8 8h16M32 20v16" />;
    case 'myp.word.take':
      return <path d="M32 44V20M22 30l10-10 10 10M20 50h24" />;
    case 'myp.word.me':
      return <path d="M18 50c2-16 6-20 14-24 6 4 8 12 6 24M40 18l10-6M40 18l8 8" />;
    case 'myp.word.you':
      return <path d="M16 18l8 8M16 18l8-6M24 18c8 6 12 14 12 32M44 50c-2-14-4-16-8-20" />;
    case 'myp.word.size':
      return (
        <>
          <path d="M8 40c6-6 10-6 14 0-4 6-8 6-14 0z" />
          <path d="M30 44c8-12 16-12 26 0-8 10-18 10-26 0z" />
        </>
      );
    case 'myp.word.amount':
      return (
        <>
          <circle cx="18" cy="36" r="4" />
          <circle cx="28" cy="30" r="4" />
          <circle cx="16" cy="26" r="4" />
          <circle cx="48" cy="34" r="3" />
          <circle cx="54" cy="42" r="3" />
        </>
      );
    case 'myp.word.danger':
      return <path d="M12 50V28M12 28h16M32 18l14 28H22zM32 28v8M32 42h.1" />;
    case 'myp.word.hunger':
      return <path d="M32 12a5 5 0 1 0 .1 0M32 22v10M24 28h16M22 48c4-8 16-8 20 0M26 36c2 4 10 4 12 0" />;
    case 'myp.word.share':
      return <path d="M12 34c8-8 14-8 20 0-6 8-12 8-20 0zM32 34c6-8 12-8 20 0-8 8-14 8-20 0zM32 26v16" />;
    case 'myp.word.wait':
      return (
        <>
          <circle cx="14" cy="24" r="5" />
          <circle cx="28" cy="20" r="5" />
          <circle cx="42" cy="24" r="5" />
          <circle cx="54" cy="18" r="4" />
          <path d="M20 48c4-10 8-12 12-12s6 4 8 12" />
        </>
      );
    case 'myp.word.promise':
      return <path d="M10 36c6-8 10-8 14 0M40 36c6-8 10-8 14 0M24 36h16M30 46h6l-2 8h-2z" />;
    case 'myp.word.trust':
      return <path d="M16 28c2-6 6-8 8-4M24 28c2-6 6-8 8-4M18 40c6 8 16 10 28-2M46 24c4 6 4 16 0 24" />;
    case 'myp.word.protect':
      return <path d="M10 36c8-16 36-16 44 0M24 40a4 4 0 1 0 .1 0M24 46v8M40 34l8 8M40 42l8-8" />;
    case 'myp.word.betray':
      return <path d="M18 18c8 6 10 14 8 28M30 30h16l6 8M44 16l8 8-8 4" />;
    case 'myp.word.lie':
      return <path d="M8 40c6 0 6-6 12-6s6 6 12 6M40 22l6 6-6 6M48 18l8 8" />;
    case 'myp.word.miss':
      return <path d="M8 40c6 0 6-6 12-6s6 6 12 6M44 18v20M44 42c6-8 10-8 12 0" strokeDasharray="3 4" />;
    case 'myp.word.forgive':
      return <path d="M12 34c6-6 10-6 14 0M38 36c6-6 10-6 14 0M26 34c2 2 6 2 8 0" />;
    case 'myp.word.home':
      return <path d="M8 34l24-16 24 16M16 34v16h32V34M28 50v-8h8v8M30 28c2 4 2 6 0 8" />;
    default:
      return <circle cx="32" cy="32" r="6" />;
  }
}
