CURRENT UPDATE: Stage 2 implementation now exists; see audit/stage2/HANDOFF.md. The following is the preserved stage-1 record.

# Stage 1 only — no business implementation

- Design: docs/superpowers/specs/2026-11-11-shore-visual-sample-design.md
- Executable plan: docs/superpowers/plans/2026-11-11-shore-visual-sample-plan.md
- Baseline: audit/baseline-results.json (39 files / 190 tests; build exit 0)
- Source inventory + source SHA/mtime: audit/baseline-source-manifest.json
- Original baseline bundles: audit/baseline-dist; original application files: audit/baseline-source
- Clean EXISTING asset evidence: audit/asset-evidence/existing-clean-shore-ground.jpg (not wired into game)

No server started. Suggested baseline localhost:8792 and candidate localhost:8793; check availability before starting. Do not reuse an existing browser origin or save. Preview baseline only: npm run preview -- --host 0.0.0.0 --port 8792 --strictPort --outDir audit/baseline-dist

All changes so far are copied baseline files, independent dependencies, generated baseline build/test logs, and plan/audit documentation. No application implementation changes. No git metadata/credentials/deployment scripts copied; no commit/cloud/deploy. Wait for parent to publish plan, then implement only in this directory.
