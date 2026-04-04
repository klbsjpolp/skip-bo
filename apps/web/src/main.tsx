import "./instrument";              // ← MUST be first
import ReactDOM from 'react-dom/client'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import Root from "@/Root.tsx";
import {reactErrorHandler} from "@sentry/react";

const updateSW = registerSW({
  onNeedRefresh() {
    // You could show a toast/button to reload
    void updateSW(true) // immediately activate and reload
  },
  onOfflineReady() {
    // Optional: show a toast that the app is ready to work offline
    console.info('App ready to work offline')
  },
})

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <Root />,
)
