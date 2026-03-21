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

package cloudservices_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kubernetes-sigs/headlamp/backend/pkg/cloudservices"
)

func TestHandler_returnsJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/cloudservices", nil)
	rr := httptest.NewRecorder()

	cloudservices.Handler()(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	ct := rr.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Fatalf("expected Content-Type application/json, got %s", ct)
	}

	var services []cloudservices.Service
	if err := json.NewDecoder(rr.Body).Decode(&services); err != nil {
		t.Fatalf("response body is not valid JSON: %v", err)
	}

	if len(services) == 0 {
		t.Fatal("expected at least one cloud service in the catalogue")
	}

	// Verify every entry has the required fields populated.
	for i, svc := range services {
		if svc.ID == "" {
			t.Errorf("service[%d]: ID must not be empty", i)
		}

		if svc.Name == "" {
			t.Errorf("service[%d]: Name must not be empty", i)
		}

		if svc.Route == "" {
			t.Errorf("service[%d]: Route must not be empty", i)
		}
	}
}

func TestHandler_coreServicesPresent(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/cloudservices", nil)
	rr := httptest.NewRecorder()

	cloudservices.Handler()(rr, req)

	var services []cloudservices.Service
	if err := json.NewDecoder(rr.Body).Decode(&services); err != nil {
		t.Fatalf("decode: %v", err)
	}

	requiredIDs := []string{"compute", "storage", "iam", "vpc", "cloud-run", "kubernetes-engine"}
	idSet := make(map[string]bool, len(services))

	for _, s := range services {
		idSet[s.ID] = true
	}

	for _, id := range requiredIDs {
		if !idSet[id] {
			t.Errorf("core service %q is missing from the catalogue", id)
		}
	}
}
