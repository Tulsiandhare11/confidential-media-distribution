import React from "react";
import { motion } from "framer-motion";
import { ShieldCheckIcon, SirenIcon, TriangleAlertIcon, BoxIcon } from "lucide-react";
import { VerifyResponse, VerifyResultType } from "../../types/api";
import { tierMeta } from "../../data/accessTiers";
import { formatDateTime, shortHash } from "../../utils/format";
import { CloudinaryTag } from "../CloudinaryTag";
const CONFIG: Record<Exclude<VerifyResultType, 'traced'>, {
  title: string;
  body: string;
  icon: BoxIcon;
  wrap: string;
  iconWrap: string;
}> = {
  exact_match: {
    title: 'Verified original',
    body: 'This file is byte-identical to an asset in your distribution ledger. It has not been altered.',
    icon: ShieldCheckIcon,
    wrap: 'bg-sage-50 ring-sage-600/25',
    iconWrap: 'bg-sage-100 text-sage-700'
  },
  modified_copy: {
    title: 'Modified copy',
    body: 'This image matches one of your assets but has been altered — cropped, re-encoded, or edited.',
    icon: TriangleAlertIcon,
    wrap: 'bg-honey-50 ring-honey-600/25',
    iconWrap: 'bg-honey-100 text-honey-700'
  },
  no_match: {
    title: 'No match',
    body: "We couldn't link this file to any asset you've distributed.",
    icon: BoxIcon,
    wrap: 'bg-cream-50 ring-taupe-500/25',
    iconWrap: 'bg-cream-200 text-taupe-700'
  }
};
const ease: [number, number, number, number] = [0.23, 1, 0.32, 1];
export function VerifyResultCard({
  result


}: {result: VerifyResponse;}) {
  if (result.result === 'traced') return <TracedReveal result={result} />;
  const c = CONFIG[result.result];
  const Icon = c.icon;
  return <motion.div initial={{
    opacity: 0,
    y: 8
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.25,
    ease
  }} className={`rounded-[20px] p-6 ring-1 ring-inset ${c.wrap}`} role="status">
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.iconWrap}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold text-ink">{c.title}</h3>
          <p className="mt-1 text-sm text-taupe-700">{result.message || c.body}</p>
          {(result.photoTitle || result.sha256 || result.similarity !== null) && <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {result.photoTitle && <Detail label="Matched asset" value={result.photoTitle} />}
              {result.similarity !== null && <Detail label="Similarity" value={`${result.similarity.toFixed(1)}%`} mono />}
              {result.sha256 && <Detail label="Original sha256" value={shortHash(result.sha256)} mono />}
            </dl>}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <CloudinaryTag label="Matched by Cloudinary AI" />
      </div>
    </motion.div>;
}
function TracedReveal({
  result


}: {result: VerifyResponse;}) {
  const item = (i: number) => ({
    initial: {
      opacity: 0,
      y: 8
    },
    animate: {
      opacity: 1,
      y: 0
    },
    transition: {
      duration: 0.28,
      ease,
      delay: 0.12 + i * 0.09
    }
  });
  const tier = result.tier ? tierMeta(result.tier) : null;
  return <motion.div initial={{
    opacity: 0,
    scale: 0.96
  }} animate={{
    opacity: 1,
    scale: 1
  }} transition={{
    duration: 0.28,
    ease
  }} className="glow-brick overflow-hidden rounded-[20px] border border-brick-100 bg-[linear-gradient(180deg,#FBEDE8_0%,#FFFDF9_70%)]" role="alert">
      <div className="p-7">
        <motion.p {...item(0)} className="flex items-center gap-2 text-sm font-extrabold text-brick-700">
          <SirenIcon className="h-4 w-4" aria-hidden /> Leak traced to a recipient
        </motion.p>
        <motion.p {...item(1)} className="mt-4 text-sm text-taupe-700">
          The watermark in this copy belongs to
        </motion.p>
        <motion.h3 {...item(2)} className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
          {result.recipientName || result.recipientEmail || 'Unknown recipient'}
        </motion.h3>
        {result.recipientName && result.recipientEmail && <motion.p {...item(3)} className="mt-1 text-[15px] font-semibold text-espresso-700">
            {result.recipientEmail}
          </motion.p>}

        <motion.dl {...item(4)} className="mt-6 grid gap-4 border-t border-brick-100 pt-5 sm:grid-cols-3">
          <Detail label="Share ID" value={result.shareId || '—'} mono />
          <Detail label="Shared" value={formatDateTime(result.sharedAt)} mono />
          <Detail label="Last accessed" value={formatDateTime(result.accessedAt)} mono />
        </motion.dl>

        <motion.div {...item(5)} className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-taupe-700">
            {result.photoTitle && <>
                Asset <span className="font-bold text-ink">{result.photoTitle}</span>
              </>}
            {tier && <> · {tier.label} access</>}
          </p>
          <CloudinaryTag label="Traced by Cloudinary AI" />
        </motion.div>
      </div>
    </motion.div>;
}
function Detail({
  label,
  value,
  mono = false




}: {label: string;value: string;mono?: boolean;}) {
  return <div className="min-w-0">
      <dt className="text-xs font-bold text-taupe-600">{label}</dt>
      <dd className={`mt-0.5 truncate text-ink ${mono ? 'mono text-xs' : 'text-sm font-bold'}`} title={value}>
        {value}
      </dd>
    </div>;
}