import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOutIcon } from 'lucide-react';
import { navigation } from '../data/navigation';
import { useAuth } from '../contexts/AuthContext';
import { initials } from '../utils/format';
import { BrandMark } from './BrandMark';
import { CloudinaryMark } from './CloudinaryMark';

export function SidebarContent({ onNavigate }: {onNavigate?: () => void;}) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="flex items-center gap-3 px-2">
        <BrandMark />
        <p className="text-[15px] font-extrabold leading-tight text-espresso-800">
          Confidential Media
          <span className="block text-sm font-bold text-taupe-700">Distribution</span>
        </p>
      </div>

      <nav className="mt-10 space-y-1" aria-label="Primary">
        {navigation.map(({ to, label, icon: Icon, end }) =>
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
          `flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-bold transition-[background-color,color,box-shadow] duration-150 ${
          isActive ? 'glow-active bg-cream-50 text-espresso' : 'text-taupe-700 hover:bg-white/40 hover:text-espresso'}`

          }>
          
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </NavLink>
        )}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/45 p-3 ring-1 ring-inset ring-white/60">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso-700 text-xs font-extrabold text-cream-100">
            {initials(user?.name ?? '', user?.email?.[0]?.toUpperCase())}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">{user?.name || 'Signed in'}</p>
            <p className="truncate text-xs text-taupe-700">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-2 text-taupe-700 transition-colors hover:bg-white/70 hover:text-brick-700"
            aria-label="Log out"
            title="Log out">
            
            <LogOutIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/60 bg-cream-50/80 px-3 py-2.5 shadow-[0_1px_2px_rgba(74,48,36,0.08)]">
          <CloudinaryMark className="h-5 w-6" />
          <p className="text-xs leading-tight text-taupe-700">
            Powered by
            <span className="block text-sm font-extrabold text-ink">Cloudinary AI</span>
          </p>
        </div>
      </div>
    </div>);

}