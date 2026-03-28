/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

async function prepare() {
  // When REACT_APP_TEST_MODE is set to 'true' the app starts without a real
  // Kubernetes backend.  MSW intercepts all fetch() calls and returns mock
  // data so the full UI can be exercised locally or in CI.
  if (import.meta.env.REACT_APP_TEST_MODE === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      // Let non-API requests (fonts, images, etc.) through unchanged.
      onUnhandledRequest: 'bypass',
    });
  }
}

prepare().then(() => {
  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(<App />);
});

/**
 * We used to have axe a11y check here
 * TODO: Integrate a11y check in e2e tests
 * https://playwright.dev/docs/accessibility-testing
 */
