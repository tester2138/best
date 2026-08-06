import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'BestForex.io - Compare The World\'s Leading Forex Platforms'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const logoData = await readFile(
    join(process.cwd(), 'public', 'bestforex-logo.png')
  )
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc',
          padding: '70px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: badge */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.10)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              borderRadius: '999px',
              padding: '12px 24px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '999px',
                backgroundColor: '#10b981',
              }}
            />
            <span
              style={{
                color: '#059669',
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '2px',
              }}
            >
              THE WORLD&apos;S LEADING FOREX BROKER COMPARISON
            </span>
          </div>
        </div>

        {/* Center: heading */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              fontSize: '88px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}
          >
            <span style={{ color: '#0a0f1c' }}>Compare The World&apos;s&nbsp;</span>
            <span style={{ color: '#10b981' }}>Leading Forex Platforms</span>
          </div>
          <span
            style={{
              marginTop: '28px',
              color: '#64748b',
              fontSize: '32px',
              fontWeight: 400,
              maxWidth: '900px',
            }}
          >
            Honest reviews, ratings, and detailed analysis to help you find the
            perfect broker.
          </span>
        </div>

        {/* Bottom: logo + stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="BestForex.io" height={56} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#0a0f1c', fontSize: '40px', fontWeight: 800 }}>
                1,800+
              </span>
              <span style={{ color: '#64748b', fontSize: '20px' }}>
                Brokers Listed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#0a0f1c', fontSize: '40px', fontWeight: 800 }}>
                1.5M+
              </span>
              <span style={{ color: '#64748b', fontSize: '20px' }}>Followers</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#0a0f1c', fontSize: '40px', fontWeight: 800 }}>
                100+
              </span>
              <span style={{ color: '#64748b', fontSize: '20px' }}>
                Ranking Data
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
