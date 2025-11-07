import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Footer } from './Footer'

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center px-3 xs:px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 py-4 sm:py-5">
          <div className="layout-content-container flex w-full max-w-[960px] flex-1 flex-col">
            <Header />
            <main className="flex flex-col gap-6 sm:gap-8 py-4 xs:py-6 sm:py-8 pb-20 md:pb-4">
              {children}
            </main>
          </div>
        </div>
      </div>
      <Footer />
      <BottomNav />
    </div>
  )
}

