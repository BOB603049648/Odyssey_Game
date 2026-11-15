/** Match the newer animation sheets to the reference idle costume. Warm skin,
 * blond hair and brown leather are excluded by relative red/blue separation;
 * bright highlights roll out of the correction. Work in sRGB, like the art.
 * This is a presentation filter: source pixels, alpha and atlas crops stay intact.
 */
export function TravelerPalette({ id }: { id: string }) {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" result="neutral"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -32 0 40 0 .2" />
        <feColorMatrix in="SourceGraphic" type="matrix" result="dark"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.54213 -1.82376 -.18411 0 2" />
        <feComposite in="neutral" in2="dark" operator="in" result="cloth" />
        <feColorMatrix in="SourceGraphic" type="matrix" result="graded"
          values=".47 0 0 0 0  0 .53 0 0 0  0 0 .64 0 0  0 0 0 1 0" />
        <feComposite in="graded" in2="cloth" operator="in" result="matched" />
        <feComposite in="SourceGraphic" in2="cloth" operator="out" result="untouched" />
        {/* Add complementary premultiplied layers; ordinary source-over would
            change edge opacity and create seams during a transition. */}
        <feComposite in="matched" in2="untouched" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </defs>
  </svg>;
}
