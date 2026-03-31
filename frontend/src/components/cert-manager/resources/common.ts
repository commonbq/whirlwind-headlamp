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

// Common types used across multiple resources

export interface LocalObjectReference {
  name: string;
}

export interface ObjectReference extends LocalObjectReference {
  kind?: string;
  group?: string;
}

export interface SecretKeySelector extends LocalObjectReference {
  key?: string;
}

export type ConditionStatus = 'True' | 'False' | 'Unknown';

export interface Condition {
  type: string;
  status: ConditionStatus;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
  observedGeneration?: number;
}

export type ACMEChallengeType = 'http-01' | 'dns-01';

export interface ACMEChallengeSolver {
  selector?: {
    matchLabels?: { [key: string]: string };
    dnsNames?: string[];
    dnsZones?: string[];
  };
  dns01?: {
    provider: string;
    [key: string]: any;
  };
  http01?: {
    ingress?: {
      serviceType?: string;
      ingressClassName?: string;
      class?: string;
      name?: string;
      podTemplate?: {
        spec: {
          nodeSelector?: {
            [key: string]: string;
          };
        };
      };
    };
  };
}

export interface IssuerReference {
  group?: string;
  kind?: string;
  name: string;
}

export interface ACMEIssuerStatus {
  uri?: string;
  lastRegisteredEmail?: string;
  lastPrivateKeyHash?: string;
}

export interface IssuerSpec {
  acme?: {
    email: string;
    server: string;
    preferredChain?: string;
    caBundle?: string;
    skipTLSVerify?: boolean;
    externalAccountBinding?: {
      keyID: string;
      keySecretRef: SecretKeySelector;
      keyAlgorithm?: 'HS256' | 'HS384' | 'HS512';
    };
    privateKeySecretRef: SecretKeySelector;
    solvers?: ACMEChallengeSolver[];
    disableAccountKeyGeneration?: boolean;
    enableDurationFeature?: boolean;
  };
  ca?: {
    secretName?: string;
    crlDistributionPoints?: string[];
  };
  vault?: {
    auth: {
      tokenSecretRef?: SecretKeySelector;
      appRole?: {
        path: string;
        roleId: string;
        secretRef: SecretKeySelector;
      };
      kubernetes?: {
        role: string;
        secretRef?: SecretKeySelector;
        mountPath?: string;
      };
    };
    path: string;
    server: string;
    caBundle?: string;
    namespace?: string;
  };
  selfSigned?: {
    crlDistributionPoints?: string[];
  };
  venafi?: {
    zone: string;
    tpp?: {
      url: string;
      credentialsRef: SecretKeySelector;
      caBundle?: string;
    };
    cloud?: {
      url?: string;
      apiTokenSecretRef: SecretKeySelector;
    };
  };
}

export interface IssuerCondition extends Condition {
  observedGeneration?: number;
}

export interface IssuerStatus {
  conditions?: IssuerCondition[];
  acme?: ACMEIssuerStatus;
}
