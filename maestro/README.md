# OrbisNews — Maestro Test Suite

## Setup
1. Install Maestro: https://maestro.mobile.dev/getting-started/installing-maestro
2. Plug phone in via USB with USB debugging enabled

## Run all tests
```
maestro test flows/
```

## Run single flow
```
maestro test flows/01_onboarding.yaml
```

## Flows
| File | What it tests |
|------|--------------|
| 01_onboarding.yaml | Country select → interests → main app |
| 02_feed.yaml | Feed loads, sort chips, open article |
| 03_quickbites.yaml | Quick Bites loads, swipe through cards |
| 04_search.yaml | Category chips, text search |
| 05_bookmarks.yaml | Bookmark an article, verify it saves |
| 06_settings.yaml | Country change, interests edit, dark mode |
| 07_offline.yaml | App doesn't crash on stale/empty state |
