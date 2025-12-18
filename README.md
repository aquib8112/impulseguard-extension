# ImpulseGuard

**Chrome Web Store:** https://chromewebstore.google.com/detail/impulseguard/nahohbbehlgmfnpjifmkcmjmcabodafp

## Overview
ImpulseGuard is a Chrome extension that enforces user‑defined focus sessions by allowing only whitelisted domains and preventing or redirecting access to non‑whitelisted tabs. It persists session state locally, schedules an authoritative end time via chrome.alarms, and provides a blocking page and an optional vision board during impulse breaks.

## Why ImpulseGuard
The extension introduces intentional friction to reduce impulsive tab switching and browsing during focused work. It performs minimal, local enforcement without sending session or uploaded data off the device.

## Core features
- Session lifecycle: start, pause, resume and stop focus sessions with authoritative end time persisted in chrome.storage.local and scheduled via chrome.alarms.  
- Whitelist enforcement: maintain a per‑session whitelist of allowed hostnames and enforce access accordingly.  
- Tab control: background logic removes new non‑whitelisted tabs and redirects non‑whitelisted updates/activations to an internal blocking page.  
- Persistent state and UX pages: session state and user‑uploaded vision images are stored locally; extension pages include a blocking page, vision board, and settings.

## Architecture (high-level)
- Session-based control: the system treats a single session object as authoritative (status, endTime or remainingTime, originalTime, whitelist). The popup creates and updates this object; the background enforces it.  
- State-driven enforcement: the background reacts to tab lifecycle events and enforces the whitelist. For example, onCreated removes non‑whitelisted new tabs; onUpdated/onActivated redirects non‑whitelisted tabs to the blocking page.  
- Timing and authority: the popup uses a local interval for countdown UI but relies on stored endTime and chrome.alarms for correctness across restarts; alarms are scheduled by the popup and handled by the background.  
- Separation of concerns: UI (popup, visionboard, settings) handles input and rendering; the session layer manages lifecycle and countdown logic; the background layer handles tab enforcement, alarms and badge updates.

## Privacy
- Session state and user uploads (e.g., vision board images) are stored only in chrome.storage.local.  
- The extension does not transmit session state or uploaded assets to external servers.

## Installation
1. Clone the repo: git clone https://github.com/aquib8112/impulseguard-extension.git  
2. If applicable, install and build: npm install && npm run build (skip if using the /src directory directly).  
3. Load unpacked in Chrome: chrome://extensions → Developer mode → Load unpacked → select the project root or build output.
