// Piece geometry - shape drawing, masks, tab rendering

function rotatePoint(px, py, cx, cy, angle) {
  let s = sin(angle), c = cos(angle);
  px -= cx; py -= cy;
  let xnew = px * c - py * s, ynew = px * s + py * c;
  return [xnew + cx, ynew + cy];
}

function drawTab(pg, x1, y1, x2, y2, offset, orientation, angleDeg = 0, widthMult = 1, tabType = 'classic') {
  let edgeLength = orientation === 'horizontal' ? abs(x2 - x1) : abs(y2 - y1);

  // Get tab shape params based on type
  let typeParams = TAB_TYPES[tabType] || TAB_TYPES.classic;
  let baseWidth = typeParams.width;
  let baseBulb = typeParams.bulb;

  let stemWidth = edgeLength * baseWidth * widthMult;
  let bulbRadius = edgeLength * baseBulb * widthMult;
  let tabDepth = offset, bulbStart = tabDepth * 0.3;
  let angle = radians(angleDeg);
  let cx = orientation === 'horizontal' ? (x1 + x2) / 2 : x1;
  let cy = orientation === 'horizontal' ? y1 : (y1 + y2) / 2;

  function rv(x, y) { return rotatePoint(x, y, cx, cy, angle); }

  let pts;
  if (orientation === 'horizontal') {
    let midX = (x1 + x2) / 2, dir = x2 > x1 ? 1 : -1;

    pts = [
      [midX - stemWidth * dir, y1 + bulbStart * 0.8, midX - stemWidth * dir, y1 + bulbStart * 0.9, midX - stemWidth * dir, y1 + bulbStart],
      [midX - stemWidth * dir, y1 + bulbStart + (tabDepth - bulbStart) * 0.3, midX - bulbRadius * 0.8 * dir, y1 + tabDepth * 0.6, midX - bulbRadius * dir, y1 + tabDepth * 0.9],
      [midX - bulbRadius * 0.6 * dir, y1 + tabDepth, midX + bulbRadius * 0.6 * dir, y1 + tabDepth, midX + bulbRadius * dir, y1 + tabDepth * 0.9],
      [midX + bulbRadius * 0.8 * dir, y1 + tabDepth * 0.6, midX + stemWidth * dir, y1 + bulbStart + (tabDepth - bulbStart) * 0.3, midX + stemWidth * dir, y1 + bulbStart],
      [midX + stemWidth * dir, y1 + bulbStart * 0.9, midX + stemWidth * dir, y1 + bulbStart * 0.7, x2, y2]
    ];
  } else {
    let midY = (y1 + y2) / 2, dir = y2 > y1 ? 1 : -1;

    pts = [
      [x1 + bulbStart * 0.7, midY - stemWidth * dir, x1 + bulbStart * 0.9, midY - stemWidth * dir, x1 + bulbStart, midY - stemWidth * dir],
      [x1 + bulbStart + (tabDepth - bulbStart) * 0.3, midY - stemWidth * dir, x1 + tabDepth * 0.6, midY - bulbRadius * 0.8 * dir, x1 + tabDepth * 0.9, midY - bulbRadius * dir],
      [x1 + tabDepth, midY - bulbRadius * 0.6 * dir, x1 + tabDepth, midY + bulbRadius * 0.6 * dir, x1 + tabDepth * 0.9, midY + bulbRadius * dir],
      [x1 + tabDepth * 0.6, midY + bulbRadius * 0.8 * dir, x1 + bulbStart + (tabDepth - bulbStart) * 0.3, midY + stemWidth * dir, x1 + bulbStart, midY + stemWidth * dir],
      [x1 + bulbStart * 0.9, midY + stemWidth * dir, x1 + tabDepth * 0.15, midY + stemWidth * dir, x2, y2]
    ];
  }

  for (let cp of pts) {
    let [x1r, y1r] = rv(cp[0], cp[1]), [x2r, y2r] = rv(cp[2], cp[3]), [x3r, y3r] = rv(cp[4], cp[5]);
    pg.bezierVertex(x1r, y1r, x2r, y2r, x3r, y3r);
  }
}

function drawPieceShape(pg, row, col, x, y, w, h, left, right, up, down) {
  let tabSize = min(w, h) * globalTabSize;
  pg.beginShape();
  pg.vertex(x, y);

  if (up !== 0) {
    pg.vertex(x + w * 0.3, y);
    drawTab(pg, x + w * 0.3, y, x + w * 0.7, y, -up * tabSize, 'horizontal',
            getEdgeAngle(row, col, 'up'), getEdgeWidth(row, col, 'up'), getEdgeTabType(row, col, 'up'));
    pg.vertex(x + w * 0.7, y);
  }
  pg.vertex(x + w, y);

  if (right !== 0) {
    pg.vertex(x + w, y + h * 0.3);
    drawTab(pg, x + w, y + h * 0.3, x + w, y + h * 0.7, right * tabSize, 'vertical',
            getEdgeAngle(row, col, 'right'), getEdgeWidth(row, col, 'right'), getEdgeTabType(row, col, 'right'));
    pg.vertex(x + w, y + h * 0.7);
  }
  pg.vertex(x + w, y + h);

  if (down !== 0) {
    pg.vertex(x + w * 0.7, y + h);
    drawTab(pg, x + w * 0.7, y + h, x + w * 0.3, y + h, down * tabSize, 'horizontal',
            getEdgeAngle(row, col, 'down'), getEdgeWidth(row, col, 'down'), getEdgeTabType(row, col, 'down'));
    pg.vertex(x + w * 0.3, y + h);
  }
  pg.vertex(x, y + h);

  if (left !== 0) {
    pg.vertex(x, y + h * 0.7);
    drawTab(pg, x, y + h * 0.7, x, y + h * 0.3, -left * tabSize, 'vertical',
            getEdgeAngle(row, col, 'left'), getEdgeWidth(row, col, 'left'), getEdgeTabType(row, col, 'left'));
    pg.vertex(x, y + h * 0.3);
  }

  pg.endShape(CLOSE);
}

function cachePieceMask(p) {
  let leftType = getEdgeType(p.row, p.col, 'left');
  let rightType = getEdgeType(p.row, p.col, 'right');
  let upType = getEdgeType(p.row, p.col, 'up');
  let downType = getEdgeType(p.row, p.col, 'down');

  let tabSize = min(pieceW, pieceH) * globalTabSize;
  let extendLeft = leftType === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'left') : 0;
  let extendRight = rightType === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'right') : 0;
  let extendUp = upType === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'up') : 0;
  let extendDown = downType === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'down') : 0;

  let bufferW = pieceW + extendLeft + extendRight;
  let bufferH = pieceH + extendUp + extendDown;

  let mask = createGraphics(bufferW, bufferH);
  mask.clear();
  mask.noStroke();
  drawPieceShape(mask, p.row, p.col, extendLeft, extendUp, pieceW, pieceH, leftType, rightType, upType, downType);

  let outline = createGraphics(bufferW, bufferH);
  outline.clear();
  outline.noFill();
  outline.stroke(0);
  outline.strokeWeight(2);
  drawPieceShape(outline, p.row, p.col, extendLeft, extendUp, pieceW, pieceH, leftType, rightType, upType, downType);

  p.mask = mask;
  p.outline = outline;
  p.extends = { extendLeft, extendUp, bufferW, bufferH };
}
