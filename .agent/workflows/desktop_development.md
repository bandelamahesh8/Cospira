---
description: Running and Building the Desktop Application
---

# Desktop Development Workflow

This workflow describes how to run and build the Cospira Desktop application.

## Prerequisites

1. Ensure Rust is installed: `rustc --version`
2. Ensure Node.js dependencies are installed: `npm install`

## Running in Development Mode

To start the desktop application in development mode with hot-reloading:

```bash
npm run desktop:dev
```

This command will:

1. Start the React dev server (Vite)
2. Compile the Rust backend
3. Launch the application window

## Building for Production

To build the distributable package (installer/executable):

```bash
npm run desktop:build
```

This will output the installers to `desktop-shell/target/release/bundle/`.

## Switching Modes

The application detects the environment automatically via `VITE_IS_DESKTOP`.

- In standard web (`npm run dev`), it runs as a web app.
- In desktop mode (`npm run desktop:dev`), it enables the `TauriDesktopAdapter` and `DesktopLayout`.

## Troubleshooting

- If Tray icon doesn't appear: Check logs in the console terminal. Ensure `icons/` folder has valid icons.
- If Window closes instead of minimizing: Ensure `setupWindowListeners` is active (check logs).
