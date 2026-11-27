import { createContext, useContext } from 'react'

export const MerchContext = createContext(null)

export function useMerch() {
  const ctx = useContext(MerchContext)
  if (!ctx) throw new Error('useMerch must be used inside MerchProvider')
  return ctx
}
