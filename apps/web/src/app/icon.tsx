import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FF3B3B 0%, #FF5757 50%, #FF7373 100%)',
          borderRadius: '6px',
        }}
      >
        {/* 金色福字 */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FFB300 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'serif',
            fontSize: 14,
            fontWeight: 900,
            color: '#FF3B3B',
          }}
        >
          福
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
