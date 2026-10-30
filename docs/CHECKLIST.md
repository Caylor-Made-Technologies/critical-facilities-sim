# Launch checklist: the 20 legal / quality points

How each point applies to this simulator. It is a static, offline teaching tool with no accounts, forms, cookies, or data collection, so many points are satisfied simply because nothing is collected.

| # | Point | Status for this project |
|---|---|---|
| 1 | Privacy policy | About page: nothing is collected or sent. Preferences and learning progress stay in your own browser's local storage. Explains how feedback works. GitHub Pages server logs are mentioned. |
| 2 | Terms of service | About page: educational use only, no warranty, not for real work, MIT license, Texas law. Marked as a template until an attorney reviews it. |
| 3 | Refund policy | N/A: free, nothing is sold. |
| 4 | Cookie policy | Covered in the privacy section: no cookies. |
| 5 | Cookie banner | Not needed: no cookies, analytics, or ad pixels. |
| 6 | Form consents | Feedback form: unchecked "18+ and read the privacy policy" (required) and unchecked "OK to reply" (optional). The consent time is written into the message. |
| 7 | No unnecessary data | Feedback asks only for type, area, an optional rating, and the message. No name or email fields; the person's own email app sends it. |
| 8 | Third-party SDKs | None at runtime. Build-time open-source dependencies are listed in `package.json` with pinned versions. |
| 9 | Dark patterns | None: no sign-ups, upsells, or timers that pressure the user. |
| 10 | Hidden fees | N/A: free. |
| 11 | Fake reviews | No testimonials section. |
| 12 | Unsupported claims | Tier descriptions are generic, plain-language explanations and say "Tier-style". No claim of certification, code compliance, or engineering accuracy. The footer disclaimer says it is not a site procedure. |
| 13 | Alt text | Logo has alt text; the diagram has a title and every component is a labeled button announcing its tag, name, and state. Rack tiles announce power and cord status. |
| 14 | Color contrast | WCAG AA verified with axe in both themes (0 violations). Status is always also shown as text ("FAILED", "open", "BATT 92%"). |
| 15 | Keyboard navigation | Skip link, visible focus ring, every component and control tabbable, Escape closes panels. |
| 16 | Business details | Footer and About page: Caylor Made Technologies, Hereford, TX, email, website, source link. |
| 17 | Kids' data | Not directed at children. No data is collected. |
| 18 | Unsubscribe link | N/A: no email. |
| 19 | Licensed fonts / images | Brand fonts Inter and Montserrat, self-hosted, SIL OFL license files shipped in `/fonts`. Logo is the business's own mark. Diagrams and icons are original SVG drawn in code. No photos. |
| 20 | Data deletion | Nothing stored server-side. "Clear my saved settings & progress" on the About page wipes local data. Feedback emails are deleted within 45 days of a request. |

## Security
- Strict Content Security Policy meta tag: `default-src 'self'`, no inline scripts, no `eval`, `connect-src 'none'`.
- No external requests at runtime. Everything is self-hosted in the build.
- Dependencies pinned to exact versions.
