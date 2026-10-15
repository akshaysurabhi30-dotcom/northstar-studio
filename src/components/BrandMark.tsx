export function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? ' brand-mark-small' : ''}`}>
    <img src="/clearcurrent-mark.png" alt="" width="384" height="384" />
  </span>
}
