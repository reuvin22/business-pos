// Tailwind class lists that many components share. Change a look here and it changes everywhere.
// Same look as the main app (my-business-fe), with bigger touch targets for the counter.
//
//   <button className={ui.btnPrimary}>Charge</button>
//   <div className={cx(ui.card, 'p-0')}>   // add or override classes with cx()
import { twMerge } from 'tailwind-merge'

/** Joins class names, skipping empty ones. When two classes clash (p-4 and p-0), the LAST one wins. */
export const cx = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(' '))

const btn =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const linkButton =
  'cursor-pointer border-0 bg-transparent p-0 text-[0.85rem] font-semibold hover:enabled:underline disabled:cursor-not-allowed disabled:text-muted'

const field =
  'rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-heading outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 disabled:opacity-70'

export const ui = {
  // ---- Layout ----
  page: 'mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 px-6 py-6 max-md:px-4 max-md:py-4',
  card: 'rounded-[10px] border border-line bg-surface p-5 max-sm:p-4',
  section: 'flex flex-col gap-3.5',
  sectionHead: 'flex flex-wrap items-center justify-between gap-3',

  // ---- Text ----
  h1: 'text-[1.5rem] font-bold tracking-tight text-heading',
  h2: 'text-[1.1rem] font-bold text-heading',
  hint: 'text-[0.85rem] text-muted',
  strong: 'font-semibold text-heading',

  // ---- Buttons ----
  btnPrimary: cx(
    btn,
    'border-transparent bg-side px-4 py-2.5 text-white hover:enabled:bg-black dark:bg-lime dark:text-ink dark:hover:enabled:bg-lime-light',
  ),
  /** The big button that finishes a sale */
  btnCharge: cx(
    btn,
    'w-full border-transparent bg-lime px-4 py-4 text-[1.1rem] text-ink hover:enabled:bg-lime-light',
  ),
  btnGhost: cx(btn, 'border-line bg-surface px-3.5 py-2 text-[0.9rem] text-heading hover:enabled:border-muted'),
  btnDanger: cx(btn, 'border-transparent bg-danger px-4 py-2.5 text-white'),
  /** A square +/- button in the cart */
  btnStep: cx(btn, 'size-9 border-line bg-surface text-[1.1rem] text-heading hover:enabled:border-muted'),
  link: cx(linkButton, 'text-accent'),
  linkDanger: cx(linkButton, 'text-danger'),

  // ---- Forms ----
  label: 'flex flex-col gap-1.5 text-[0.88rem] font-semibold text-heading',
  input: cx(field, 'w-full'),
  inputAuto: cx(field, 'w-auto'),
  formGrid: 'grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4',
  formActions: 'flex flex-wrap items-center justify-end gap-2.5',

  // ---- Messages ----
  alertError: 'rounded-lg bg-danger-soft px-3 py-2.5 text-[0.9rem] whitespace-pre-line text-danger',
  alertInfo: 'rounded-lg bg-info-soft px-3 py-2.5 text-[0.9rem] text-info',
  alertWarn: 'rounded-lg bg-warn-soft px-3 py-2.5 text-[0.9rem] text-warn',

  // ---- Tables ----
  tableWrap: 'w-full overflow-x-auto rounded-[10px] border border-line bg-surface',
  table: 'w-full border-collapse text-[0.9rem] [&_tbody>tr:last-child>td]:border-b-0',
  th: 'border-b border-line px-4 py-3 text-left text-[0.75rem] font-semibold whitespace-nowrap text-muted',
  td: 'border-b border-line px-4 py-3 whitespace-nowrap',
  num: 'text-right tabular-nums',

  // ---- Small bits ----
  chip: 'rounded-full bg-chip px-2.5 py-0.75 text-[0.75rem] font-semibold text-body',
  badge: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-[0.75rem] font-semibold whitespace-nowrap',
}
