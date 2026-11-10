import { LoginForm } from '@/core/components/login-form'
import loginFormStyles from '@/core/components/login-form.module.css'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.cardWrap}>
        <div className={loginFormStyles.card}>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
