// The HTML shell for a book page. Everything interactive lives in web/lib/book-view.js; this only
// carries the title and description and points at the shared assets, so a book page is a few
// lines of generated markup rather than a copy of the viewer.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function bookPage(book) {
  const { name } = book.book;
  const { topics, portals, outbound } = book.counts;
  const desc = `${topics} topics in ${name}, and the ${outbound} cross-references that tie them to the rest of scripture. Built from the King James text.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${esc(desc)}">
<title>${esc(name)} &middot; bible-taxonomy</title>
<link rel="stylesheet" href="../lib/ui.css">
<link rel="stylesheet" href="../lib/book-view.css">
</head>
<body>
<div id="app" data-portals="${portals}">
  <noscript>This map needs JavaScript.</noscript>
</div>
<script type="module" src="../lib/book-view.js"></script>
</body>
</html>
`;
}
