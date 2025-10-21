import type { PropsWithChildren } from 'react'
import styles from './center-layout.module.css'

export function CenterLayout({ children }: PropsWithChildren) {
  return <div className={styles.center}>{children}</div>
}
