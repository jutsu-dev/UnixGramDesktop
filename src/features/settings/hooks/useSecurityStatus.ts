import { useCallback, useEffect, useState } from 'react'
import { loadSecurityStatus, type SecurityStatus } from '../../../shared/ipc'

/**
 * Security centre data. Stays `null` in the browser preview and while the first request is pending;
 * `refresh` re-reads it after an action that can change it (saving, account changes).
 */
export function useSecurityStatus() {
  const [security, setSecurity] = useState<SecurityStatus | null>(null)

  const refresh = useCallback(() => {
    void loadSecurityStatus().then(setSecurity).catch(() => undefined)
  }, [])

  useEffect(refresh, [refresh])

  return { security, refresh }
}
