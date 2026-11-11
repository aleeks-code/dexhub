'use client'

import { useState } from 'react'
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'
import { ChiSection } from './_landing/chi-section'
import { FaqSection } from './_landing/faq-section'
import { InvitoSection } from './_landing/invito-section'
import { Footer } from './_landing/footer'
import { LoginModal } from './_landing/login-modal'

export function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <div className={styles.page}>
      <Nav onOpenLogin={() => setLoginOpen(true)} />
      <Hero onOpenLogin={() => setLoginOpen(true)} />
      <ModuliSection />
      <PercheSection />
      <ChiSection />
      <FaqSection />
      <InvitoSection />
      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
