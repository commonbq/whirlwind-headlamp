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

export interface TenantPool {
  name?: string;
  servers: number;
  volumesPerServer: number;
  volumeClaimTemplate?: {
    metadata?: {
      name?: string;
    };
    spec?: {
      accessModes?: string[];
      resources?: {
        requests?: {
          storage?: string;
        };
      };
      storageClassName?: string;
    };
  };
  resources?: {
    requests?: {
      cpu?: string;
      memory?: string;
    };
    limits?: {
      cpu?: string;
      memory?: string;
    };
  };
  affinity?: Record<string, unknown>;
  nodeSelector?: Record<string, string>;
  tolerations?: unknown[];
}

export interface TenantUsage {
  rawCapacity?: string;
  rawUsage?: string;
  capacity?: string;
  usage?: string;
}

export interface MinioTenant extends KubeObjectInterface {
  spec: {
    image?: string;
    imagePullPolicy?: string;
    pools?: TenantPool[];
    requestAutoCert?: boolean;
    mountPath?: string;
    configuration?: {
      name?: string;
    };
    env?: { name: string; value?: string; valueFrom?: Record<string, unknown> }[];
    serviceAccountName?: string;
    imagePullSecret?: {
      name: string;
    };
    exposeServices?: {
      minio?: boolean;
      console?: boolean;
    };
  };
  status?: {
    availableReplicas?: number;
    currentState?: string;
    healthStatus?: string;
    revision?: number;
    syncVersion?: string;
    usage?: TenantUsage;
    pools?: {
      legacySecurityContext?: boolean;
      servers?: number;
      ssNames?: string[];
    }[];
    certificates?: {
      autoGenerateCACert?: boolean;
      expiryDate?: string;
    };
  };
}

export const TENANT_ENV_SECRET_NAME = 'minio-env-configuration';

export class Tenant extends KubeObject<MinioTenant> {
  static kind = 'Tenant';
  static apiName = 'tenants';
  static apiVersion = 'minio.min.io/v2';
  static isNamespaced = true;

  static getBaseObject(): MinioTenant {
    const baseObject = super.getBaseObject() as MinioTenant;
    baseObject.metadata = {
      ...baseObject.metadata,
      namespace: '',
    };
    baseObject.spec = {
      configuration: {
        name: TENANT_ENV_SECRET_NAME,
      },
      pools: [
        {
          name: 'pool-0',
          servers: 4,
          volumesPerServer: 4,
          volumeClaimTemplate: {
            metadata: {
              name: 'data',
            },
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: {
                requests: {
                  storage: '10Gi',
                },
              },
            },
          },
        },
      ],
      requestAutoCert: false,
    };
    return baseObject;
  }

  get currentState(): string {
    return this.jsonData.status?.currentState ?? '';
  }

  get healthStatus(): string {
    return this.jsonData.status?.healthStatus ?? '';
  }

  get availableReplicas(): number {
    return this.jsonData.status?.availableReplicas ?? 0;
  }

  get totalServers(): number {
    return (this.jsonData.spec?.pools ?? []).reduce((sum, pool) => sum + (pool.servers ?? 0), 0);
  }

  get image(): string {
    return this.jsonData.spec?.image ?? '';
  }

  get usage(): TenantUsage {
    return this.jsonData.status?.usage ?? {};
  }

  get spec(): MinioTenant['spec'] {
    return this.jsonData.spec;
  }

  get status(): MinioTenant['status'] {
    return this.jsonData.status;
  }
}
