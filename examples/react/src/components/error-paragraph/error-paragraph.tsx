import type { PropsWithChildren } from 'react'
import styles from './error-paragraph.module.css'

export function ErrorParagraph({ children }: PropsWithChildren) {
  return (
    <p className={styles.errorText}>
      {children}
    </p>
  )
}
