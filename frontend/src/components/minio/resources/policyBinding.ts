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

import { KubeObject, type KubeObjectInterface } from '../../../lib/k8s/cluster';

export interface MinioPolicyBinding extends KubeObjectInterface {
  spec: {
    application?: {
      namespace?: string;
      serviceaccount?: string;
    };
    policies?: string[];
  };
  status?: {
    conditions?: {
      type: string;
      status: string;
      reason?: string;
      message?: string;
      lastTransitionTime?: string;
    }[];
  };
}

export class PolicyBinding extends KubeObject<MinioPolicyBinding> {
  static kind = 'PolicyBinding';
  static apiName = 'policybindings';
  static apiVersion = 'sts.min.io/v1alpha1';
  static isNamespaced = true;

  get serviceAccount(): string {
    return this.jsonData.spec?.application?.serviceaccount ?? '';
  }

  get serviceAccountNamespace(): string {
    return this.jsonData.spec?.application?.namespace ?? '';
  }

  get policies(): string[] {
    return this.jsonData.spec?.policies ?? [];
  }

  get spec(): MinioPolicyBinding['spec'] {
    return this.jsonData.spec;
  }

  get status(): MinioPolicyBinding['status'] {
    return this.jsonData.status;
  }
}
