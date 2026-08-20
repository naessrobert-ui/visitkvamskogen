import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VelApp from './VelApp.jsx';
import PollEnhancer from './pollEnhancer.jsx';
import AttachmentEnhancer from './attachmentEnhancer.jsx';
import './vel.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <>
      <VelApp />
      <PollEnhancer />
      <AttachmentEnhancer />
    </>
  </StrictMode>,
);
