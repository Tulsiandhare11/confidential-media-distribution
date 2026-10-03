import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BanIcon, ChevronDownIcon, CloudUploadIcon, EyeIcon, HistoryIcon, KeyRoundIcon, LoaderCircleIcon, ScanSearchIcon, SendIcon, ShieldAlertIcon, type LucideIcon } from "lucide-react";
import { getAudit } from "../api";
import { useApiResource } from "../hooks/useApiResource";
import { formatDateTime, humanize, shortHash } from "../utils/format";
import { CloudinaryMark } from "./CloudinaryMark";
import { ErrorState } from "./ErrorState";
interface CustodyTimelineProps {
  photoId: string;
  collapsible?: boolean;
}
function eventVisual(type: string): {
  icon:  LucideIcon;
  tone: string;
} {
  const t = type.toLowerCase();
  if (t.includes('deni') || t.includes('fail')) return {
    icon: ShieldAlertIcon,
    tone: 'bg-brick-50 text-brick-700'
  };
  if (t.includes('revok')) return {
    icon: BanIcon,
    tone: 'bg-brick-50 text-brick-700'
  };
  if (t.includes('step')) return {
    icon: KeyRoundIcon,
    tone: 'bg-terracotta-50 text-terracotta-700'
  };
  if (t.includes('view')) return {
    icon: EyeIcon,
    tone: 'bg-sage-50 text-sage-700'
  };
  if (t.includes('share')) return {
    icon: SendIcon,
    tone: 'bg-cream-200 text-espresso'
  };
  if (t.includes('upload') || t.includes('creat')) return {
    icon: CloudUploadIcon,
    tone: 'bg-cream-200 text-espresso'
  };
  if (t.includes('verif') || t.includes('trace')) return {
    icon: ScanSearchIcon,
    tone: 'bg-honey-50 text-honey-700'
  };
  return {
    icon: HistoryIcon,
    tone: 'bg-cream-200 text-taupe-700'
  };
}
function isCloudinaryEvent(type: string) {
  const t = type.toLowerCase();
  return t.includes('cloudinary') || t.includes('analy') || t.includes('moderat') || t.includes('detect');
}
export function CustodyTimeline({
  photoId,
  collapsible = false
}: CustodyTimelineProps) {
  const [open, setOpen] = useState(!collapsible);
  const {
    data,
    error,
    loading,
    reload
  } = useApiResource(() => getAudit(photoId), [photoId]);
  const events = data ?? [];
  const body = <div className="pt-4">
      {loading && !data && <div className="flex items-center gap-2 py-6 text-sm text-taupe-700">
          <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden /> Loading History..
        </div>}
      {error && <ErrorState message={error} onRetry={reload} compact />}
      {!loading && !error && events.length === 0 && <p className="py-6 text-sm text-taupe-700">No recorded events yet.</p>}
      {events.length > 0 && <ol className="relative">
          {events.map((event, i) => {
        const {
          icon: Icon,
          tone
        } = eventVisual(event.type);
        const last = i === events.length - 1;
        return <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-cream-400" aria-hidden />}
                <span className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-cream-50 ${tone}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-extrabold text-ink">{humanize(event.type)}</p>
                    {isCloudinaryEvent(event.type) && <CloudinaryMark className="h-3 w-3.5" />}
                  </div>
                  {(event.actor || event.actorEmail) && <p className="text-sm text-taupe-700">
                      {event.actor || event.actorEmail}
                      {event.actor && event.actorEmail && <span className="text-taupe-600"> · {event.actorEmail}</span>}
                    </p>}
                  {event.detail && <p className="mt-0.5 text-sm text-taupe-700">{event.detail}</p>}
                  <p className="mono mt-1 text-[11px] text-taupe-600">{formatDateTime(event.at)}</p>
                  {event.signature && <p className="mono mt-0.5 truncate text-[11px] text-taupe-600" title={event.signature}>
                      sig {shortHash(event.signature, 14)}
                    </p>}
                </div>
              </li>;
      })}
        </ol>}
    </div>;
  if (!collapsible) return body;
  return <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-espresso" aria-hidden />
          <span className="text-sm font-extrabold text-ink">History</span>
          {data && <span className="mono text-xs text-taupe-600">{events.length}</span>}
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-taupe-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: 'auto',
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.22,
        ease: [0.23, 1, 0.32, 1]
      }} className="overflow-hidden">
            {body}
          </motion.div>}
      </AnimatePresence>
    </div>;
}