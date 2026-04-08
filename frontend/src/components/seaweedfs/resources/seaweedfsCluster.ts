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

export interface SeaweedFSComponentSpec {
  replicas?: number;
  storage?: string;
  storageClassName?: string;
  requests?: {
    memory?: string;
    cpu?: string;
  };
  limits?: {
    memory?: string;
    cpu?: string;
  };
}

export interface SeaweedFSFilerSpec extends SeaweedFSComponentSpec {
  maxMB?: number;
  s3?: {
    enabled?: boolean;
  };
}

export interface SeaweedFSMasterSpec extends SeaweedFSComponentSpec {
  volumeSizeLimitMB?: number;
}

export interface SeaweedFSClusterInterface extends KubeObjectInterface {
  spec: {
    image?: string;
    master?: SeaweedFSMasterSpec;
    volume?: SeaweedFSComponentSpec;
    filer?: SeaweedFSFilerSpec;
  };
  status?: {
    phase?: string;
  };
}

export class SeaweedFSCluster extends KubeObject<SeaweedFSClusterInterface> {
  // The kind name 'Seaweedfs' matches the actual SeaweedFS Operator CRD kind exactly.
  static kind = 'Seaweedfs';
  static apiName = 'seaweedfs';
  static apiVersion = 'seaweedfs.com/v1';
  static isNamespaced = true;

  static getBaseObject(): SeaweedFSClusterInterface {
    const baseObject = super.getBaseObject() as SeaweedFSClusterInterface;
    baseObject.metadata = {
      ...baseObject.metadata,
      namespace: '',
    };
    baseObject.spec = {
      master: {
        replicas: 1,
        storage: '4Gi',
        volumeSizeLimitMB: 1024,
      },
      volume: {
        replicas: 1,
        storage: '4Gi',
        requests: {
          memory: '512Mi',
          cpu: '100m',
        },
      },
      filer: {
        replicas: 1,
        maxMB: 4,
        storage: '4Gi',
        s3: {
          enabled: false,
        },
      },
    };
    return baseObject;
  }

  get image(): string {
    return this.jsonData.spec?.image ?? '';
  }

  get phase(): string {
    return this.jsonData.status?.phase ?? '';
  }

  get masterReplicas(): number {
    return this.jsonData.spec?.master?.replicas ?? 0;
  }

  get volumeReplicas(): number {
    return this.jsonData.spec?.volume?.replicas ?? 0;
  }

  get filerReplicas(): number {
    return this.jsonData.spec?.filer?.replicas ?? 0;
  }

  get spec(): SeaweedFSClusterInterface['spec'] {
    return this.jsonData.spec;
  }

  get status(): SeaweedFSClusterInterface['status'] {
    return this.jsonData.status;
  }
}
