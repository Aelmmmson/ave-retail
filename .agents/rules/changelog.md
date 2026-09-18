# Rule: High-Signal Release-Ready CHANGELOG Maintenance

Maintain a clean, release-ready history of functional and architectural changes in `CHANGELOG.md` without cluttering it with minor scratch work or transient in-session tweaks.

---

## 1. How Updates Are Selected for the Changelog

Changelog entries are guided by the standard [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. The goal is to maintain a clean, release-ready history of functional and architectural changes without cluttering it with minor scratch work.

---

## 2. What Changes Make It to the Changelog

1. **New Features (`Added`)**:
   - New user-facing capabilities (e.g., cross-browser barcode detector fallback, POS camera scanner).
   - New backend API endpoints or WebSocket channels (e.g., `/api/v1/auth/users/:id`).
   - New core infrastructure or UI components (`BarcodeScannerModal.tsx`, `ExpenseView.tsx`).

2. **Critical Bug Fixes (`Fixed`)**:
   - Fixes for workflow logic issues, system calculation errors, or database query failures.
   - Fixes for document formatting, layout clipping, or modal z-index/layering bugs (e.g., tooltip alignment clipping, modal header blur backdrop coverage).
   - Fixes for edge-case crashes or error handling failures.

3. **Workflow & Architectural Changes (`Changed`)**:
   - Modifications to approval matrix rules, security policies, RBAC models, or database schemas.
   - Breaking API signature updates or structural refactorings.

4. **Security & Deprecations (`Security` / `Deprecated`)**:
   - JWT authentication updates, permission model changes, or deprecated feature removals.

---

## 3. What Changes Are Excluded

- **Transient In-Session Fixes**: Quick syntax/typo fixes or lint/type resolution while writing code within a turn.
- **Scratch Scripts & Environment Commands**: Setup scripts, temporary files, or test commands executed locally during debugging.
- **Trivial Refactoring**: Renaming internal private variables or formatting code without changing user-facing behavior or system contracts.

---

## 4. Selection & Maintenance Process

Evaluate every change against this policy. Whenever an update introduces a **functional feature, API endpoint, critical bug fix, or structural architectural change**, log it under the current version in `CHANGELOG.md`. Omit transient debugging steps and minor typo fixes.
