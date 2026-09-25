# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed
- **Language switcher**: replace the locale dropdown with a single toggle button that cycles `ID → EN → KR` on click; adds translated `switchLanguage` tooltip (id/en/kr).
- **Term form**: category `<select>` replaced with `DCodeAutoComplete`, including `item-value="code"` binding so the category value resolves correctly.
- **Styling**: introduce `src/assets/main.css` design-token layer (CSS variables, button/table/badge/input component classes, scrollbar, view-transition theme reveal); rework `tailwind.config.js` (dark mode toggling, primary color scales, gradient/grid safelist, motion keyframes); add shadcn `components.json`.
- **Dependencies**: bump `@gemafajarramadhan/dynamic-ui` from `1.4.46` to `1.4.61`.
- **Extension**: fix group-fill timing so each language is typed before its screenshot step, then a single settle wait before verifying.

### Refactored
- Format `src/App.vue` and `src/components/TermFormDialog.vue` to consistently use semicolons and 4-space indentation.