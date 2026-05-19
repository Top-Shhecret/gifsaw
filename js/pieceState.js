// Piece state management - initialization, placement, completion check

function isInExclusionZone(x, y, w, h) {
  const zoneW = width * 0.5;  // 50% of screen width
  const zoneH = height * 0.5; // 50% of screen height
  const zoneX = (width - zoneW) / 2;
  const zoneY = (height - zoneH) / 2;

  return x + w > zoneX && x < zoneX + zoneW &&
         y + h > zoneY && y < zoneY + zoneH;
}

function initialisePieces() {
  const totalPieces = cols * rows;
  let placedPositions = [];

  for (let i = 0; i < totalPieces; i++) {
    let randX, randY, overlaps, attempts = 0;
    do {
      randX = random(width - pieceW);
      randY = random(height - pieceH);
      overlaps = placedPositions.some(p => abs(randX - p.x) < pieceW * 1.2 && abs(randY - p.y) < pieceH * 1.2) ||
                 isInExclusionZone(randX, randY, pieceW, pieceH);
      attempts++;
    } while (overlaps && attempts < 10000);
    placedPositions.push({ x: randX, y: randY });
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let i = r * cols + c;
      let neighbors = {};
      if (c > 0) neighbors.left = i - 1;
      if (c < cols - 1) neighbors.right = i + 1;
      if (r > 0) neighbors.up = i - cols;
      if (r < rows - 1) neighbors.down = i + cols;

      let p = {
        index: i,
        col: c,
        row: r,
        x: placedPositions[i].x,
        y: placedPositions[i].y,
        neighbors,
        group: [i]
      };

      cachePieceMask(p);
      pieces.push(p);
    }
  }
}

function checkPuzzleComplete() {
  if (!pieces.length) return false;
  const firstGroup = pieces[0].group;
  return pieces.every(p => p.group === firstGroup);
}
