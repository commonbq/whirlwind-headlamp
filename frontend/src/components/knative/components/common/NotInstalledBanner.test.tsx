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

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TestContext } from '../../../../test';
import { useEnableKnative } from '../../hooks/useEnableKnative';
import { NotInstalledBanner } from './NotInstalledBanner';

vi.mock('../../hooks/useEnableKnative', () => ({
  useEnableKnative: vi.fn(),
}));

const mockUseEnableKnative = vi.mocked(useEnableKnative);

describe('NotInstalledBanner', () => {
  it('does not render an install method label for cluster admins', () => {
    mockUseEnableKnative.mockReturnValue({
      isClusterAdmin: true,
      isCheckingPermissions: false,
      enableKnative: vi.fn(),
    });

    render(
      <TestContext>
        <NotInstalledBanner clusters={['test-cluster']} />
      </TestContext>
    );

    expect(screen.queryByText(/Install method:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Helm Operator Flow/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable Service' })).toBeInTheDocument();
  });

  it('shows the Helm success message after enabling Knative', async () => {
    const enableKnative = vi.fn().mockResolvedValue(undefined);

    mockUseEnableKnative.mockReturnValue({
      isClusterAdmin: true,
      isCheckingPermissions: false,
      enableKnative,
    });

    render(
      <TestContext>
        <NotInstalledBanner clusters={['test-cluster']} />
      </TestContext>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enable Service' }));

    expect(enableKnative).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(
        'Knative Serving has been installed through the Knative Operator flow and is ready to use.'
      )
    ).toBeInTheDocument();
  });
});
