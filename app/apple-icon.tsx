import { ImageResponse } from 'next/og'

// Apple touch icon — 180×180 PNG served via Next.js file convention.
// Registered as <link rel="apple-touch-icon"> in the document head automatically.
// Matches the BestForex.io logo mark at display size.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#2ECC71',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Upward trending chart line + arrow, scaled for 180px canvas */}
        <svg
          width="112"
          height="112"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polyline
            points="1,15 6,9 10,12 15,4"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline
            points="10.5,3 15,4 14,8.5"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
