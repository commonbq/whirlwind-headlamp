# KNative Plugin for Headlamp

A Headlamp plugin that provides a UI for managing [KNative](https://knative.dev/) Serving and Eventing resources, inspired by GCP Cloud Run.

## Features

### Serving
- **Services List**: View all KNative services across namespaces with status indicators (Ready/Not Ready), service URLs, and latest revision info.
- **Service Detail**: Detailed view of a KNative service including:
  - Service URL (clickable)
  - Container configuration (image, resources, environment variables, concurrency, timeout)
  - Traffic splits with visual progress bars
  - Condition status table
  - Revision history with latest revision highlighted
- **Revisions List**: Browse all revisions across namespaces with status, image, and concurrency info.

### Eventing
- **Brokers**: View KNative Eventing brokers with status and address URL.
- **Triggers**: View triggers with broker association, subscriber, and event filters.

## Usage

The plugin adds a **KNative** top-level sidebar entry with sub-menus for Serving and Eventing.

> **Note**: KNative must be installed in your cluster for this plugin to show data. If KNative CRDs are not present, the plugin will display a helpful error message.

## Running the Plugin

```bash
cd plugins/native/knative
npm install
npm start
# Open Headlamp and look for "KNative" in the sidebar.
```

## Building

```bash
npm run build
```

## Requirements

- [KNative Serving](https://knative.dev/docs/install/) installed in your cluster for Serving features.
- [KNative Eventing](https://knative.dev/docs/eventing/) installed in your cluster for Eventing features.

## API References

- [registerSidebarEntry](https://headlamp.dev/docs/latest/development/api/modules/plugin_registry/#registersidebarentry)
- [registerRoute](https://headlamp.dev/docs/latest/development/api/modules/plugin_registry/#registerroute)
- [ApiProxy](https://headlamp.dev/docs/latest/development/api/modules/lib_k8s_apiProxy/)
