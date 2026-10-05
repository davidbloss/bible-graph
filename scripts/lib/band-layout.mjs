// Band layout for a book page. Each section is a horizontal band; the topics in it flow left to
// right, wrapping, in reading order, so the page reads like a contents list that happens to carry
// edges. Topics outside the book (portals) flow through one more band at the bottom, grouped by the
// book they live in.
//
// Chosen over a chapter-proportional timeline because that layout leaves 68 titles with nowhere to
// go: neighbouring topics sit a few pixels apart and every label collides. A fixed cell size makes
// each title readable, and reading order is still left-to-right, top-to-bottom.
//
// Pure and deterministic. Nothing here knows about Genesis.

export const CELL = { w: 188, h: 46, cols: 8, padX: 44, head: 46, gap: 30, top: 40, dotX: 12 };

export const canvasWidth = () => CELL.padX * 2 + CELL.cols * CELL.w;

// `bands`: [{ key, items: [id | { header: string }] }]. Returns band geometry and one cell per
// item. A header item takes a cell of its own and always starts a new row, so a book's heading
// never sits at the end of the previous book's row.
export function layoutBands(bands) {
  let y = CELL.top;
  const out = [];
  for (const band of bands) {
    const top = y;
    let col = 0;
    let row = 0;
    const cells = [];
    for (const item of band.items) {
      if (typeof item === 'object' && col !== 0) { col = 0; row++; }
      cells.push({
        item,
        x: CELL.padX + col * CELL.w + CELL.dotX,
        y: top + CELL.head + row * CELL.h + CELL.h / 2,
        col,
        row,
      });
      col++;
      if (col === CELL.cols) { col = 0; row++; }
    }
    const rows = cells.length ? cells[cells.length - 1].row + 1 : 1;
    const h = CELL.head + rows * CELL.h + 8;
    out.push({ key: band.key, top, h, cells });
    y = top + h + CELL.gap;
  }
  return { bands: out, height: y - CELL.gap + CELL.top };
}
