# Handover

Current focus:
- Strengthen SEO / LLO / GEO without making the site awkward for humans.
- Emphasize that the shop is repair-led, but can also source and sell used cars.
- Keep the site readable, direct, and easy to quote by humans and LLMs.

What is already in place:
- Analytics rework is done.
- GA4 uses measurement ID `G-ZR46K2ME6D`.
- Clarity uses project `xh8bpqs76a`.
- Opt-out page exists at `/analytics-optout/`.
- Weekly report generator exists at `scripts/weekly-marketing-report.ps1`.

Current evidence from Clarity:
- `repair-maintenance/` shows dead clicks around the repair landing area.
- `used-cars/` has traffic interest around sourcing, repair-before-sale, and post-purchase support.
- Some old `mycarcenter.netlify.app` URLs still appear in recordings, but redirects are already in place.

Recommended next site edits:
- Keep the homepage lead short and human-friendly, but explicitly mention one-stop repair / sourcing / sales.
- Make the used-cars page say, in plain language, that the shop can source, repair, and sell used cars in one flow.
- Make the repair page point to used-car consultation where it helps contextually.
- Keep paragraphs readable for people; avoid keyword stuffing and machine-like repetition.

Working rule:
- If a sentence is useful for a human visitor, it is usually useful for LLO / GEO too.
- Prefer clear summaries and concrete examples over slogan stacking.
- Do not expose internal marketing language such as "AI / search summary", "traffic data", or "content for LLMs" in customer-facing pages.
- Avoid the phrases `見られます`, `町の整備工場`, and `整備まで見て`. Prefer concrete wording such as `点検・整備に対応します` or `地域密着の整備工場`.

Design direction (2026-07-10 review):
- Keep white, pale blue, restrained blue/cyan CTAs, generous spacing, and the Yamamoto red logo.
- The homepage hero uses the real-photo carousel with a full-width left fade. Do not put the hero copy inside a floating white/translucent card.
- Homepage hero copy is intentionally two lines on desktop and the hero is capped at 700px desktop / 620px mobile.
- Core service pages use compact split heroes on desktop and hide the summary panel on phones so the first view is not consumed by the hero.
- `bankin-toso/`, `shaken/`, `maintenance/`, and `new-cars/` share the `service-detail-hero` structure but use different restrained accent colors.
- Article pages use an editorial header and readable content width. SEO / LLO / GEO structure must still read naturally to a person.
- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-site.ps1` after site-wide copy or layout changes.

Current changes applied:
- Homepage hero now says the shop can handle repair, inspection, used-car sourcing, finishing, and sales in one flow.
- Used-cars page now emphasizes that repair is the core strength and that sourcing, prep, and sales are one continuous process.
- Repair page now links back to used-cars and mentions pre-purchase inspection / sales prep.

Current report status:
- Weekly report rerun on 2026-07-10 and latest artifact updated.
- Clarity data is still usable.
- GA4 Data API still returns 403, so the report currently falls back to Clarity-only evidence.

Working note:
- Keep copy concise and human-readable; that is also the safest shape for SEO / LLO / GEO.

GA4 auth update:
- The report script now accepts either service-account JSON or authorized_user ADC JSON.
- This means user-account auth can be used once a local ADC file is created with gcloud.
- The machine currently does not have an ADC file yet, so the script is ready but not switched over in practice.


Local Google Cloud SDK status:
- Installed at %LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd.
- Verified with `gcloud --version`.
- `gcloud auth application-default login --no-launch-browser` reaches the Google sign-in URL, but the interactive login still needs a real browser session from the user.


GA4 auth result:
- gcloud application-default login completed successfully and created an authorized_user ADC file.
- The weekly report now runs with that ADC file, but GA4 still returns 403 Forbidden.
- That points to GA4 property access / Data API permission, not a local auth failure.
