// Asset status display helpers shared by the list and detail views.

// statusBadgeClass returns background/text color classes for an asset status:
// Active -> green, Processing -> yellow, Failed -> red.
export function statusBadgeClass(status: string): string {
  if (status === 'Failed') {
    return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
  }
  if (status === 'Processing') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
  }
  return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
}

// statusLabel maps an asset status code to its localized label.
export function statusLabel(
  status: string,
  t: (key: string) => string
): string {
  if (status === 'Active') return t('可用')
  if (status === 'Processing') return t('处理中')
  if (status === 'Failed') return t('失败')
  return t(status)
}
