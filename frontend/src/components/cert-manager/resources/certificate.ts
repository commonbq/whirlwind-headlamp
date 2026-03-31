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
import { Condition, IssuerReference, SecretKeySelector } from './common';

export type KeyUsage =
  | 'signing'
  | 'digital signature'
  | 'content commitment'
  | 'key encipherment'
  | 'key agreement'
  | 'data encipherment'
  | 'cert sign'
  | 'crl sign'
  | 'encipher only'
  | 'decipher only'
  | 'any'
  | 'server auth'
  | 'client auth'
  | 'code signing'
  | 'email protection'
  | 's/mime'
  | 'ipsec end system'
  | 'ipsec tunnel'
  | 'ipsec user'
  | 'timestamping'
  | 'ocsp signing'
  | 'microsoft sgc'
  | 'netscape sgc';

export type PrivateKeyAlgorithm = 'RSA' | 'ECDSA' | 'Ed25519';
export type PrivateKeyEncoding = 'PKCS1' | 'PKCS8';
export type PrivateKeyRotationPolicy = 'Never' | 'Always';

export interface X509Subject {
  organizations?: string[];
  countries?: string[];
  organizationalUnits?: string[];
  localities?: string[];
  provinces?: string[];
  streetAddresses?: string[];
  postalCodes?: string[];
  serialNumber?: string;
}

export interface CertificateKeystores {
  jks?: {
    create: boolean;
    passwordSecretRef?: SecretKeySelector;
  };
  pkcs12?: {
    create: boolean;
    passwordSecretRef?: SecretKeySelector;
  };
}

export interface CertificatePrivateKey {
  rotationPolicy?: PrivateKeyRotationPolicy;
  encoding?: PrivateKeyEncoding;
  algorithm?: PrivateKeyAlgorithm;
  size?: number;
}

export interface NameConstraintItem {
  dnsDomains?: string[];
  ipRanges?: string[];
  emailAddresses?: string[];
  uriDomains?: string[];
}

export interface CertManagerCertificate extends KubeObjectInterface {
  spec: {
    subject?: X509Subject;
    literalSubject?: string;
    commonName?: string;
    duration?: string;
    renewBefore?: string;
    renewBeforePercentage?: number;
    dnsNames?: string[];
    ipAddresses?: string[];
    uris?: string[];
    otherNames?: {
      oid: string;
      utf8Value: string;
    }[];
    emailAddresses?: string[];
    secretName: string;
    secretTemplate?: {
      annotations?: Record<string, string>;
      labels?: Record<string, string>;
    };
    keystores?: CertificateKeystores;
    issuerRef: IssuerReference;
    isCA?: boolean;
    usages?: KeyUsage[];
    privateKey?: CertificatePrivateKey;
    encodeUsagesInRequest?: boolean;
    revisionHistoryLimit?: number;
    additionalOutputFormats?: {
      type: 'pem' | 'der';
    };
    nameConstraints?: {
      critical?: boolean;
      permitted?: NameConstraintItem;
      excluded?: NameConstraintItem;
    };
  };
  status: {
    conditions: Condition[];
    lastFailureTime?: string;
    notBefore?: string;
    notAfter?: string;
    renewalTime?: string;
    revision?: number;
    nextPrivateKeySecretName?: string;
    failedIssuanceAttempts?: number;
  };
}

export class Certificate extends KubeObject<CertManagerCertificate> {
  static kind = 'Certificate';
  static apiName = 'certificates';
  static apiVersion = 'cert-manager.io/v1';
  static isNamespaced = true;

  get ready() {
    return (
      this.status?.conditions?.find(condition => condition.type === 'Ready')?.status === 'True'
    );
  }

  get organizations(): string[] {
    return this.spec.subject?.organizations || [];
  }

  get status() {
    return this.jsonData.status;
  }

  get spec() {
    return this.jsonData.spec;
  }
}
