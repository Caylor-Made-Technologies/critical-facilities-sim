# Launch checklist: the 20 legal / quality points

How each point applies to this simulator. It is a static, offline teaching tool with no accounts, forms, cookies, or data collection, so many points are satisfied simply because nothing is collected.

| # | Point | Status for this project |
|---|---|---|
| 1 | Privacy policy | Short "Privacy" section on the site: nothing is collected, stored, or sent. Optional settings (theme, units) stay in your own browser. |
| 2 | Terms of service | Short "Terms of use" section: educational use only, no warranty, not a site procedure, Texas law. Template until a lawyer reviews it. |
| 3 | Refund policy | N/A: free, nothing is sold. |
| 4 | Cookie policy | Covered in the privacy section: no cookies. |
| 5 | Cookie banner | Not needed: no cookies, analytics, or ad pixels. |
| 6 | Form consents | N/A: no forms. |
| 7 | No unnecessary data | No data is collected at all. |
| 8 | Third-party SDKs | None at runtime. Build-time open-source dependencies are listed in `package.json` with pinned versions. |
| 9 | Dark patterns | None: no sign-ups, upsells, or timers that pressure the user. |
| 10 | Hidden fees | N/A: free. |
| 11 | Fake reviews | No testimonials section. |
| 12 | Unsupported claims | Tier descriptions are generic, plain-language explanations and say "Tier-style". No claim of certification, code compliance, or engineering accuracy. The footer disclaimer says it is not a site procedure. |
| 13 | Alt text | Every diagram SVG gets a `<title>`/`aria-label`. Components are reachable as a text list for screen readers. |
| 14 | Color contrast | WCAG AA (4.5:1) in light and dark themes. Status is never shown by color alone (icons + text too). |
| 15 | Keyboard navigation | Skip link, visible focus ring, every component and control tabbable, Escape closes panels. |
| 16 | Business details | Footer: "Built by Caylor Made Technologies, Hereford, TX" plus a contact email and GitHub link. |
| 17 | Kids' data | Not directed at children. No data is collected. |
| 18 | Unsubscribe link | N/A: no email. |
| 19 | Licensed fonts / images | System font stack (no font files). All diagrams are original SVG drawn in code. No photos. |
| 20 | Data deletion | Nothing stored server-side. A "Reset settings" button clears local preferences. |

## Security
- Strict Content Security Policy meta tag: `default-src 'self'`, no inline scripts, no `eval`, `connect-src 'none'`.
- No external requests at runtime. Everything is self-hosted in the build.
- Dependencies pinned to exact versions.
