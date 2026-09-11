SheetJS CE 0.20.3, downloaded from its official distribution:
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz

The npm registry only supplies the vulnerable 0.18.5 release. Vendoring this
official archive makes builds reproducible without depending on CDN availability.
See https://docs.sheetjs.com/docs/getting-started/installation/nodejs/.
The archive includes its upstream license. npm's lockfile verifies its integrity.
