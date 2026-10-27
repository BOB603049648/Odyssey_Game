export function PlateStack({ plate, previous }: { plate: string; previous: string | null }) {
  return (
    <div className="plate-stack" aria-hidden="true">
      {previous ? <PlateLayer plate={previous} leaving /> : null}
      <PlateLayer plate={plate} leaving={false} incoming={previous !== null} />
    </div>
  );
}

function PlateLayer({
  plate,
  leaving,
  incoming = false,
}: {
  plate: string;
  leaving: boolean;
  incoming?: boolean;
}) {
  const className = leaving ? 'plate-fade out' : incoming ? 'plate-fade in' : 'plate-fade';
  return (
    <div className={className} data-ambient={plate}>
      <div className="plate-photo" data-plate={plate} />
      <div className="ambient ambient-water" />
      <div className="ambient ambient-flame" />
      <div className="ambient ambient-leaves" />
      <div className="ambient ambient-rain" />
      <div className="ambient ambient-dark" />
    </div>
  );
}

export function EnterVeil() {
  return <div className="enter-veil" aria-hidden="true" />;
}
