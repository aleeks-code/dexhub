import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingPage } from './landing-page'

export default async function HomePage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('better-auth.session_token')
  if (session) redirect('/home')

  return <LandingPage />
}
