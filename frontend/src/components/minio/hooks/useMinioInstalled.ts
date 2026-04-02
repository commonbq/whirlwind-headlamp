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

import { useEffect, useState } from 'react';
import { isMinioInstalled } from '../isMinioInstalled';

export function useMinioInstalled() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkMinioInstalled() {
      const installed = await isMinioInstalled();
      setIsInstalled(installed);
    }
    checkMinioInstalled();
  }, []);

  return {
    isMinioInstalled: isInstalled,
    isMinioCheckLoading: isInstalled === null,
  };
}
