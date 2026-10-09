import { useSyncExternalStore } from 'react'

export const tabs = ['home', 'days', 'add', 'items', 'profile'] as const
export type Tab = typeof tabs[number]
const getTab = (): Tab => tabs.find(tab => location.hash === `#${tab}`) ?? 'home'
const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
export const useTab = () => useSyncExternalStore(subscribe, getTab)
export function navigate(tab: Tab) { location.hash = tab }
