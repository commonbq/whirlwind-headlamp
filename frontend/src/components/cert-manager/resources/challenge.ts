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
import { ACMEChallengeSolver, IssuerReference } from './common';

export interface CertManagerChallenge extends KubeObjectInterface {
  spec: {
    url: string;
    authorizationURL: string;
    dnsName: string;
    wildcard?: boolean;
    type: 'HTTP-01' | 'DNS-01';
    token: string;
    key: string;
    issuerRef: IssuerReference;
    solver: ACMEChallengeSolver;
  };
  status: {
    presented: boolean;
    processing: boolean;
    reason?: string;
    state?: 'valid' | 'ready' | 'pending' | 'processing' | 'invalid' | 'expired' | 'errored' | '';
  };
}

export class Challenge extends KubeObject<CertManagerChallenge> {
  static kind = 'Challenge';
  static apiName = 'challenges';
  static apiVersion = 'acme.cert-manager.io/v1';
  static isNamespaced = true;

  get status() {
    return this.jsonData.status;
  }

  get spec() {
    return this.jsonData.spec;
  }
}
