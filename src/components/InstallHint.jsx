import { useEffect, useState } from 'react'

// A small, dismissible "install this app" nudge shown on the menu.
//  - Android / desktop Chrome fire `beforeinstallprompt` → we show a real Install
//    button that triggers the native prompt.
//  - iOS Safari has no such event, so when we're on iOS and NOT already running as
//    an installed app, we show the Share → "Add to Home Screen" instructions.
// Dismissal is remembered so it only ever nudges once.

const DISMISS_KEY = 'sightread.installHintDismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  const ua = window.navigator.userAgent
  const iDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as desktop Safari but is touch + Safari
  const iPadDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iDevice || iPadDesktop
}

export default function InstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [standalone, setStandalone] = useState(isStandalone())

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    function onInstalled() {
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      await deferredPrompt.userChoice
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null)
    dismiss()
  }

  if (dismissed || standalone) return null

  const ios = isIOS()
  // Nothing useful to show: not iOS and no install prompt available.
  if (!ios && !deferredPrompt) return null

  return (
    <div className="install-hint">
      <span className="install-emoji">📲</span>
      <div className="install-body">
        {deferredPrompt ? (
          <>
            <b>Install Sightread</b> for a one-tap daily drill that works offline.
          </>
        ) : (
          <>
            <b>Add to your Home Screen</b> — tap Share <span className="ios-share">⎋</span> then
            “Add to Home Screen” for a one-tap daily drill that works offline.
          </>
        )}
      </div>
      {deferredPrompt && (
        <button className="install-btn" onClick={install}>
          Install
        </button>
      )}
      <button className="install-x" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
