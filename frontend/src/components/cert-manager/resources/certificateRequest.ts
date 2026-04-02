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
import { KeyUsage } from './certificate';
import { Condition, IssuerReference } from './common';

export interface CertManagerCertificateRequest extends KubeObjectInterface {
  spec: {
    duration?: string;
    issuerRef: IssuerReference;
    request: string;
    isCA?: boolean;
    usages?: KeyUsage[];
    username?: string;
    uid?: string;
    groups?: string[];
    extra?: { [key: string]: string[] };
  };
  status: {
    conditions: Condition[];
    certificate?: string;
    ca?: string;
    failureTime?: string;
  };
}

export class CertificateRequest extends KubeObject<CertManagerCertificateRequest> {
  static kind = 'CertificateRequest';
  static apiName = 'certificaterequests';
  static apiVersion = 'cert-manager.io/v1';
  static isNamespaced = true;

  get status() {
    return this.jsonData.status;
  }

  get spec() {
    return this.jsonData.spec;
  }

  get approved() {
    return this.status?.conditions?.find(condition => condition.type === 'Approved')?.status;
  }

  get denied() {
    return this.status?.conditions?.find(condition => condition.type === 'Denied')?.status;
  }

  get ready() {
    return this.status?.conditions?.find(condition => condition.type === 'Ready')?.status;
  }
}
