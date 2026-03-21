/*
Copyright 2025 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Package cloudservices provides the HTTP handler for the cloud services catalogue endpoint.
// It returns a static list of the core cloud platform services that CloudLamp exposes,
// mapping Kubernetes primitives to familiar cloud-platform concepts (Compute, Storage, etc.).
package cloudservices

import (
	"encoding/json"
	"net/http"

	"github.com/kubernetes-sigs/headlamp/backend/pkg/logger"
)

// Service describes a single entry in the CloudLamp service catalogue.
type Service struct {
	// ID is the unique machine-readable identifier used in frontend routing.
	ID string `json:"id"`
	// Name is the human-readable display name shown in the console.
	Name string `json:"name"`
	// Description gives a one-line summary of what the service does.
	Description string `json:"description"`
	// Icon is an Iconify icon identifier (see https://icon-sets.iconify.design/).
	Icon string `json:"icon"`
	// Category groups related services together in the console UI.
	Category string `json:"category"`
	// Route is the in-app path the user is navigated to when they click the service card.
	Route string `json:"route"`
}

// coreServices is the minimal set of cloud platform services that CloudLamp exposes.
// Each entry maps to an existing Kubernetes resource view already present in the UI.
var coreServices = []Service{
	{
		ID:          "compute",
		Name:        "Compute Engine",
		Description: "Scalable virtual machines and container workloads powered by Kubernetes Pods and Deployments.",
		Icon:        "mdi:server",
		Category:    "Compute",
		Route:       "/workloads",
	},
	{
		ID:          "cloud-run",
		Name:        "Cloud Run",
		Description: "Fully managed container runtime backed by Kubernetes Services and Deployments.",
		Icon:        "mdi:run-fast",
		Category:    "Compute",
		Route:       "/services",
	},
	{
		ID:          "storage",
		Name:        "Cloud Storage",
		Description: "Unified object and block storage through Kubernetes Persistent Volumes and Claims.",
		Icon:        "mdi:database",
		Category:    "Storage",
		Route:       "/storage/persistentvolumeclaims",
	},
	{
		ID:          "vpc",
		Name:        "VPC Network",
		Description: "Virtual private cloud networking via Kubernetes Network Policies and Ingress.",
		Icon:        "mdi:folder-network-outline",
		Category:    "Networking",
		Route:       "/network-policies",
	},
	{
		ID:          "iam",
		Name:        "IAM & Admin",
		Description: "Identity and access management built on Kubernetes RBAC, Roles and Service Accounts.",
		Icon:        "mdi:shield-account",
		Category:    "Security",
		Route:       "/service-accounts",
	},
	{
		ID:          "kubernetes-engine",
		Name:        "Kubernetes Engine",
		Description: "Managed Kubernetes clusters — the foundation of the CloudLamp platform.",
		Icon:        "mdi:hexagon-multiple-outline",
		Category:    "Compute",
		Route:       "/",
	},
}

// Handler returns an HTTP handler that serves the cloud services catalogue as JSON.
func Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if err := json.NewEncoder(w).Encode(coreServices); err != nil {
			logger.Log(logger.LevelError, nil, err, "encoding cloud services response")
			http.Error(w, "internal server error", http.StatusInternalServerError)

			return
		}
	}
}
