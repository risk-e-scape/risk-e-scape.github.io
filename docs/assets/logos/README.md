# Logo assets

Files are referenced by `config.json` — `partners[].file`, `euFunding.file` and `brand.logo`.
`build.js` warns at build time if a referenced file is missing; the page then renders a text
placeholder rather than a broken image.

| File | Used for |
|---|---|
| `riskescape.png` | RISK-E-SCAPE project mark, site header |
| `banner.png` | Info Day banner, not currently used on any page |
| `uoa.jpg` | National and Kapodistrian University of Athens — Greece |
| `ku.svg` | Kathmandu University — Nepal |
| `pu.jpg` | Pokhara University — Nepal |
| `du.png` | University of Dhaka — Bangladesh (host) |
| `iub.png` | Independent University, Bangladesh |
| `unisa.png` | University of Salerno — Italy |
| `ufp.jpg` | Universidade Fernando Pessoa — Portugal |
| `eu.png` | Co-funded by the European Union emblem |

## ⚠️ Confirm the partner list

The consortium was first read off a photograph of the Info Day banner, and two entries were read
wrong — Kathmandu and Pokhara were initially recorded as Bangladeshi universities, misreading
Devanagari as Bangla. The list above matches the supplied files, but **have the coordination office
confirm the full list, the spellings and the left-to-right order before publishing.**

## Rendering notes

Marks are supplied dark-on-transparent or dark-on-white and would disappear against a dark
background. `site.css` puts them on a white plate in dark mode rather than recolouring them —
recolouring a partner's mark generally breaches their brand rules.

Raster files are used as supplied. If a partner offers SVG, prefer it: sharper on the site and
usable at certificate print size. Update the `file` value in `config.json` to match the new
extension.

## Usage conditions

University marks are trademarks. Use on a consortium project site is normally fine, but each
institution may set rules on clear space, minimum size and recolouring.

The EU emblem is different: its use is **governed by the grant agreement**. The emblem and the
funding statement are required, and the wording must match what the agreement specifies. Check
`euFunding.disclaimer` in `config.json` against the actual grant agreement before publishing —
the placeholder names EACEA, which may not be the correct granting authority for this project.

## Adding or changing a partner

Edit `partners` in `config.json`, drop the file here, rebuild. Every page's logo strip and partner
list is generated from that array.
