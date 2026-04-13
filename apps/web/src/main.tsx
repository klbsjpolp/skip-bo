import "./instrument";              // ← MUST be first
import ReactDOM from 'react-dom/client'
import './index.css'
import Root from "@/Root.tsx";
import {reactErrorHandler} from "@sentry/react";
import {initializePwaUpdates} from '@/lib/pwaUpdates';

initializePwaUpdates();

ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <Root />,
)
