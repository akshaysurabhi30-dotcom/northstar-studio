import type { CSSProperties } from 'react'

const paths = {
  wave: 'M2 8c3-4 5 4 8 0s5 4 8 0M2 14c3-4 5 4 8 0s5 4 8 0',
  pin: 'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  target: 'M12 2v4m0 12v4M2 12h4m12 0h4M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'm6 6 12 12M6 18 18 6',
  drop: 'M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z',
} as const

export function Icon({ name, size = 20, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>
}
