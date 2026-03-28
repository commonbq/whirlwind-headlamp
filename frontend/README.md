# Headlamp Frontend

React frontend for the Headlamp.

[Documentation](https://headlamp.dev/docs/latest/development/frontend/)

## TEST mode (no real cluster needed)

You can run the frontend without a real Kubernetes backend using TEST mode.
All API calls are intercepted by [MSW](https://mswjs.io/) and answered with
realistic mock data (a single `test-cluster` with nodes, pods, deployments,
services, etc.).

```bash
# From the repo root
npm run frontend:start:test

# Or from the frontend directory
npm run start:test
```

The app starts at `http://localhost:3000`. No backend process is required.

To enable TEST mode in your own scripts set:

```
REACT_APP_TEST_MODE=true
```
