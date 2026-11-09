# Third-party assets

- **pdf-lib 1.17.1** — MIT. Unmodified ES-module distribution from the npm package. License: `PDF-LIB-LICENSE.md`. Source: https://github.com/Hopding/pdf-lib
- **@pdf-lib/fontkit 1.1.1** — unmodified UMD build (includes pako). MIT, as declared by its package metadata and upstream README. The original README is included as `FONTKIT-README.md` (including its license link). Author of this fork: Andrew Dillon; original project: foliojs/fontkit. Source: https://github.com/Hopding/fontkit
- **IPA Gothic (`ipag.ttf`)** — redistributed unmodified. IPA Font License v1.0 and package attribution: `IPA-FONT-LICENSE.txt`. Source: https://moji.or.jp/ipafont/ipafontdownload/

The libraries are loaded from this site's `vendor/` directory, not a third-party CDN. The full Japanese font is retained so ordinary Japanese text added by hand to `routines.json` can be printed without rebuilding a font. Exported PDFs embed only the glyphs used in that document.
