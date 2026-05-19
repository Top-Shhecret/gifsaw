// Interaction - dragging, snapping, group management

function dragging() {
  if (draggingPiece === null || justSnapped) return;

  let base = pieces[draggingPiece];
  let dx = mouseX - offsetX - base.x;
  let dy = mouseY - offsetY - base.y;

  let group = draggingGroup.map(i => pieces[i]);
  let minX = min(group.map(p => p.x));
  let minY = min(group.map(p => p.y));
  let maxX = max(group.map(p => p.x + pieceW));
  let maxY = max(group.map(p => p.y + pieceH));

  let allowedDx = dx;
  let allowedDy = dy;

  if (minX + dx < 0) allowedDx = -minX;
  if (maxX + dx > width) allowedDx = width - maxX;
  if (minY + dy < 0) allowedDy = -minY;
  if (maxY + dy > height) allowedDy = height - maxY;

  for (let p of group) {
    p.x += allowedDx;
    p.y += allowedDy;
  }
}

function checkSnap(index) {
  const snapDist = 10;
  const pw = pieceW;
  const ph = pieceH;

  let piece = pieces[index];

  for (let dir in piece.neighbors) {
    let neighborIndex = piece.neighbors[dir];
    let neighbor = pieces[neighborIndex];
    if (!neighbor) continue;
    if (piece.group === neighbor.group) continue;

    let expectedX = piece.x;
    let expectedY = piece.y;
    if (dir === "left") expectedX -= pw;
    if (dir === "right") expectedX += pw;
    if (dir === "up") expectedY -= ph;
    if (dir === "down") expectedY += ph;

    let dx = neighbor.x - expectedX;
    let dy = neighbor.y - expectedY;
    let dist = sqrt(dx * dx + dy * dy);

    if (dist < snapDist) {
      alignGroups(piece.index, neighbor.index, dir);
      mergeGroups(piece.index, neighbor.index);
      justSnapped = true;
      draggingPiece = null;
      draggingGroup = [];
    }
  }
}

function alignGroups(aIndex, bIndex, dir) {
  let groupA = pieces[aIndex].group;
  let groupB = pieces[bIndex].group;
  if (groupA === groupB) return;

  let pieceA = pieces[aIndex];
  let pieceB = pieces[bIndex];

  let targetX = pieceA.x;
  let targetY = pieceA.y;
  if (dir === "left") targetX -= pieceW;
  if (dir === "right") targetX += pieceW;
  if (dir === "up") targetY -= pieceH;
  if (dir === "down") targetY += pieceH;

  let dx = targetX - pieceB.x;
  let dy = targetY - pieceB.y;

  for (let i of groupB) {
    pieces[i].x += dx;
    pieces[i].y += dy;
  }
}

function mergeGroups(aIndex, bIndex) {
  let groupA = pieces[aIndex].group;
  let groupB = pieces[bIndex].group;
  if (groupA === groupB) return;

  let merged = [...new Set([...groupA, ...groupB])];
  for (let i of merged) pieces[i].group = merged;
  click.play();

  if (checkPuzzleComplete()) {
    clearInterval(timerInterval);
    console.log("Puzzle complete in " + timerValue + " seconds!");
  }
}
