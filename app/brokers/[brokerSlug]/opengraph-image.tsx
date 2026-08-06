import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getCompanyBySlug } from '@/data/directory'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ brokerSlug: string }>
}

export default async function BrokerOGImage({ params }: Props) {
  const { brokerSlug } = await params
  const company = getCompanyBySlug(brokerSlug)

  // Fallback values when company is not found
  const name = company?.name ?? 'Broker Review'
  const rating = company?.rating ?? 0
  const ratingLabel = rating > 0 ? rating.toFixed(1) : 'Not Rated'
  const category = company?.category === 'prop-firm' ? 'Prop Trading Firm' : 'Forex Broker'
  const regulators = company?.regulators?.slice(0, 2).join(' · ') ?? ''

  // Load site logo for branding strip
  const logoData = await readFile(join(process.cwd(), 'public', 'bestforex-logo.png'))
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  // Try to load broker logo — fall back gracefully if missing
  let brokerLogoSrc: string | null = null
  if (company?.slug) {
    try {
      const brokerLogoData = await readFile(
        join(process.cwd(), 'public', 'logos', 'brokers', `${company.slug}.svg`)
      )
      brokerLogoSrc = `data:image/svg+xml;base64,${brokerLogoData.toString('base64')}`
    } catch {
      // Logo not on disk — skip, render name only
    }
  }

  // Star rating bar (filled out of 5)
  const filledStars = Math.round(rating)
  const stars = Array.from({ length: 5 }, (_, i) => i < filledStars)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0f1c',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: category pill */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '999px',
              padding: '10px 22px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '999px',
                backgroundColor: '#10b981',
              }}
            />
            <span style={{ color: '#10b981', fontSize: '20px', fontWeight: 600, letterSpacing: '1px' }}>
              {category.toUpperCase()} REVIEW
            </span>
          </div>
        </div>

        {/* Center: broker logo + name + rating */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {brokerLogoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brokerLogoSrc}
                alt={name}
                width={80}
                height={80}
                style={{ borderRadius: '16px', backgroundColor: '#fff', padding: '8px' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  color: '#f8fafc',
                  fontSize: '74px',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-2px',
                }}
              >
                {name}
              </span>
            </div>
          </div>

          {/* Stars + score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {stars.map((filled, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '40px',
                    color: filled ? '#10b981' : '#334155',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <span style={{ color: '#f8fafc', fontSize: '48px', fontWeight: 700 }}>
              {ratingLabel}
            </span>
            {regulators && (
              <span style={{ color: '#64748b', fontSize: '24px', marginLeft: '16px' }}>
                · {regulators}
              </span>
            )}
          </div>
        </div>

        {/* Bottom: site branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="BestForex.io" height={44} />
          <span style={{ color: '#475569', fontSize: '22px' }}>
            Independent Forex Broker Reviews
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
