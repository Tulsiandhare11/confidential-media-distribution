import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import { SidebarContent } from './SidebarContent';
import { BrandMark } from './BrandMark';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sidebar-surface sticky top-0 hidden h-screen w-[264px] shrink-0 md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sidebar-surface flex items-center justify-between border-b border-r-0 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-sm font-extrabold text-espresso-800">Confidential Media Distribution</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-espresso"
            aria-label="Open navigation">
            
            <MenuIcon className="h-5 w-5" />
          </button>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen &&
        <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <button
            type="button"
            className="absolute inset-0 bg-espresso-900/30"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)} />
          
            <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="sidebar-surface relative h-full w-[280px]">
            
              <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-taupe-700"
              aria-label="Close navigation">
              
                <XIcon className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}