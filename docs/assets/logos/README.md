# Logo assets

Referenced from `config.json` (`partners[].file`, `euFunding.file`, `brand.logo`). If a file is
missing, the page shows a small text placeholder instead of a broken image.

| File | Used for |
| --- | --- |
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

Marks are shown on a white plate in dark mode rather than recoloured, since recolouring a
partner's logo generally breaches their brand rules.

## EU emblem wording

Its use is governed by the grant agreement — the emblem and funding statement are required, and
the wording must match the agreement. `euFunding.disclaimer` in `config.json` is a placeholder
naming EACEA; confirm the correct granting authority before this goes final.

## Adding or changing a partner

Edit `partners` in `config.json`, drop the file here, rebuild.
