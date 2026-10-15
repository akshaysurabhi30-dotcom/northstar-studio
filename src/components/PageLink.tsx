import type { ReactNode } from 'react'

export function PageLink({ to, children, className, onClick }: { to: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return <a href={`#${to}`} className={className} onClick={onClick}>{children}</a>
}
