import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function AppleIcon() {
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
          borderRadius: '36px',
          position: 'relative',
        }}
      >
        {/* 发光效果 */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(255, 229, 127, 0.3) 0%, rgba(255, 215, 0, 0) 70%)',
          }}
        />

        {/* 金色装饰线 - 顶部 */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 36,
            right: 36,
            height: 4,
            background: 'linear-gradient(90deg, #FFD700 0%, #FFC107 50%, #FFB300 100%)',
            borderRadius: 2,
            opacity: 0.8,
          }}
        />

        {/* 金色装饰线 - 底部 */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 36,
            right: 36,
            height: 4,
            background: 'linear-gradient(90deg, #FFD700 0%, #FFC107 50%, #FFB300 100%)',
            borderRadius: 2,
            opacity: 0.8,
          }}
        />

        {/* 金色福字圆形 */}
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FFB300 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.4)',
            position: 'relative',
          }}
        >
          {/* 内圈白色叠加 */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          />

          {/* 福字 */}
          <div
            style={{
              fontFamily: 'serif',
              fontSize: 56,
              fontWeight: 900,
              color: '#FF3B3B',
              position: 'relative',
            }}
          >
            福
          </div>
        </div>

        {/* 装饰点 - Web3 元素 */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 50,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FFD700',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 55,
            right: 50,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FFE57F',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            left: 55,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FFC107',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 55,
            right: 55,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FFB300',
            opacity: 0.9,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
