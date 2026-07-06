/**
 * DiffBadge — inline badge shown next to sections/cards in diff mode.
 * type: 'added' | 'removed' | 'changed' | 'unchanged'
 */
export default function DiffBadge({ type, count }) {
  if (!type || type === 'unchanged') return null;

  const config = {
    added:   { label: count ? `+${count} added`    : '+ new',     cls: 'badge-success' },
    removed: { label: count ? `-${count} removed`  : '− removed', cls: 'badge-danger' },
    changed: { label: count ? `~${count} changed`  : '~ changed', cls: 'badge-warning' },
  };

  const { label, cls } = config[type] ?? config.changed;
  return <span className={`badge ${cls}`}>{label}</span>;
}
