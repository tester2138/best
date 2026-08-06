import { ImageResponse } from 'next/og'

// Next.js App Router favicon route.
// Rendered at build time and injected as <link rel="icon"> in every page <head>.
// Matches the BestForex.io logo mark: emerald green rounded square + white
// upward-trending chart arrow — identical to public/bestforex-logo.png icon.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#2ECC71',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Upward trending chart line + arrow head, matching the logo mark */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Trend line: bottom-left → dip → steep up-right */}
          <polyline
            points="1,15 6,9 10,12 15,4"
            stroke="white"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          {/* Arrow head at the top-right */}
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
