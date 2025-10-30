let gif;
let cols, rows;
let pieceW, pieceH;
let numFrames;
let currentFrame;

let pieces = [];
let draggingPiece = null;
let draggingGroup = [];
let offsetX = 0;
let offsetY = 0;
const rotationConst = 1;
const globalTabSize = 0.30
const idealTotalPieces = 32;
let edgeConfigs = [];
let click;

function preload() {
  const params = new URLSearchParams(window.location.search);
  const gifUrl = params.get('gif_url');

  function onLoad() {
    console.log('GIF loaded successfully:', gifUrl || 'default');
  }

  function onError(err) {
    console.error('Gif failed to load:', gifUrl || 'default', err);
  }

  const url = gifUrl || 'https://media1.giphy.com/media/Y8dKrq2sDjQ5y/giphy.gif';

  gif = loadImage(
    url,
    onLoad,
    onError,
    { crossOrigin: '' }
  );

  click = loadSound('click.mp3')
}


function setup() {
  pixelDensity(1);
  noSmooth();
  createCanvas(windowWidth, windowHeight);
  let screenArea = windowWidth * windowHeight;
  let gifArea = gif.width * gif.height;
  let targetArea = screenArea * 0.3;
  let scaleFactor = sqrt(targetArea / gifArea);

  gif.resize(gif.width * scaleFactor, gif.height * scaleFactor);
  frameRate(30);

  numFrames = gif.numFrames ? gif.numFrames() : 1;
  currentFrame = 0;

  let aspectRatio = gif.width / gif.height;
  rows = round(sqrt(idealTotalPieces / aspectRatio));
  cols = round(idealTotalPieces / rows);
  pieceW = gif.width / cols;
  pieceH = gif.height / rows;

  generateEdgeConfigs();

  let totalPieces = cols * rows;
  let placedPositions = [];
  for (let i = 0; i < totalPieces; i++) {
    let randX, randY, overlaps, attempts = 0;
    do {
      randX = random(width - pieceW * 1.5);
      randY = random(height - pieceH * 1.5);
      overlaps = placedPositions.some(p => abs(randX - p.x) < pieceW * 1.2 && abs(randY - p.y) < pieceH * 1.2);
      attempts++;
    } while (overlaps && attempts < 500);
    placedPositions.push({ x: randX, y: randY });
  }

  // Build pieces and cache masks
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
  mask.fill(255);
  drawPieceShape(mask, p.row, p.col, extendLeft, extendUp, pieceW, pieceH, leftType, rightType, upType, downType);

  p.mask = mask;
  p.extends = { extendLeft, extendUp, bufferW, bufferH };
}

function generateEdgeConfigs() {
  let hEdges = [], vEdges = [];
  let hAngles = [], vAngles = [];
  let hWidths = [], vWidths = [];

  // Horizontal edges (between columns)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      const angle = random(-rotationConst, rotationConst);
      const widthMult = random(1, 1.4); // Increased random width multiplier range
      hEdges.push(tabDir);
      hAngles.push(angle);
      hWidths.push(widthMult);
    }
  }

  // Vertical edges (between rows)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      const angle = random(-rotationConst, rotationConst);
      const widthMult = random(1, 1.4); // Increased random width multiplier range
      vEdges.push(tabDir);
      vAngles.push(angle);
      vWidths.push(widthMult);
    }
  }

  edgeConfigs = { h: hEdges, v: vEdges, hAngles, vAngles, hWidths, vWidths };
}

function getEdgeAngle(row, col, side) {
  if (side === 'left') {
    if (col === 0) return 0;
    let idx = row * (cols - 1) + (col - 1);
    return edgeConfigs.hAngles[idx];
  }
  if (side === 'right') {
    if (col === cols - 1) return 0;
    let idx = row * (cols - 1) + col;
    return edgeConfigs.hAngles[idx];
  }
  if (side === 'up') {
    if (row === 0) return 0;
    let idx = (row - 1) * cols + col;
    return edgeConfigs.vAngles[idx];
  }
  if (side === 'down') {
    if (row === rows - 1) return 0;
    let idx = row * cols + col;
    return edgeConfigs.vAngles[idx];
  }
  return 0;
}

function getEdgeWidth(row, col, side) {
  if (side === 'left') {
    if (col === 0) return 1;
    let idx = row * (cols - 1) + (col - 1);
    return edgeConfigs.hWidths[idx];
  }
  if (side === 'right') {
    if (col === cols - 1) return 1;
    let idx = row * (cols - 1) + col;
    return edgeConfigs.hWidths[idx];
  }
  if (side === 'up') {
    if (row === 0) return 1;
    let idx = (row - 1) * cols + col;
    return edgeConfigs.vWidths[idx];
  }
  if (side === 'down') {
    if (row === rows - 1) return 1;
    let idx = row * cols + col;
    return edgeConfigs.vWidths[idx];
  }
  return 1;
}

function rotatePoint(px, py, cx, cy, angle) {
  let s = sin(angle);
  let c = cos(angle);
  px -= cx;
  py -= cy;
  let xnew = px * c - py * s;
  let ynew = px * s + py * c;
  return [xnew + cx, ynew + cy];
}

function getEdgeType(row, col, side) {
  // Returns 1 (tab), -1 (blank), or 0 (straight edge)
  if (side === 'left') {
    if (col === 0) return 0;
    let edgeIdx = row * (cols - 1) + (col - 1);
    return -edgeConfigs.h[edgeIdx]; // If edge config is 1, right piece gets blank (-1)
  }
  if (side === 'right') {
    if (col === cols - 1) return 0;
    let edgeIdx = row * (cols - 1) + col;
    return edgeConfigs.h[edgeIdx]; // If edge config is 1, left piece gets tab (1)
  }
  if (side === 'up') {
    if (row === 0) return 0;
    let edgeIdx = (row - 1) * cols + col;
    return -edgeConfigs.v[edgeIdx]; // If edge config is 1, bottom piece gets blank (-1)
  }
  if (side === 'down') {
    if (row === rows - 1) return 0;
    let edgeIdx = row * cols + col;
    return edgeConfigs.v[edgeIdx]; // If edge config is 1, top piece gets tab (1)
  }
  return 0;
}

function draw() {
  //console.log(frameRate());
  background(220);
  if (gif.numFrames) gif.setFrame(currentFrame);
  currentFrameImage = gif.get();

  for (let i = 0; i < pieces.length; i++) {
    if (draggingPiece !== null && draggingGroup.includes(i)) continue;
    drawPieceFast(i);
  }
  if (draggingPiece !== null) {
    for (let i of draggingGroup) drawPieceFast(i);
  }

  currentFrame = (currentFrame + 1) % numFrames;
}

function drawPieceFast(i) {
  let p = pieces[i];
  let { extendLeft, extendUp, bufferW, bufferH } = p.extends;

  // Get cropped piece from current frame
  let sx = p.col * pieceW - extendLeft;
  let sy = p.row * pieceH - extendUp;
  let imgPiece = currentFrameImage.get(sx, sy, bufferW, bufferH);
  imgPiece.mask(p.mask);

  // Draw the masked image
  image(imgPiece, p.x - extendLeft, p.y - extendUp);

  // Draw the outline using the cached mask shape
  push();
  noFill();
  stroke(0, 100);
  strokeWeight(2);

  translate(p.x - extendLeft, p.y - extendUp);
  drawPieceShape(
    this, // draw directly to main canvas
    p.row,
    p.col,
    extendLeft,
    extendUp,
    pieceW,
    pieceH,
    getEdgeType(p.row, p.col, "left"),
    getEdgeType(p.row, p.col, "right"),
    getEdgeType(p.row, p.col, "up"),
    getEdgeType(p.row, p.col, "down")
  );
  pop();
}

function drawPieceShape(pg, row, col, x, y, w, h, left, right, up, down) {
  let tabSize = min(w, h) * globalTabSize;

  pg.beginShape();

  // Start top-left
  pg.vertex(x, y);

  // Top edge
  if (up === 0) {
    pg.vertex(x + w, y);
  } else {
    pg.vertex(x + w * 0.3, y);
    drawTab(pg, x + w * 0.3, y, x + w * 0.7, y, -up * tabSize, 'horizontal', getEdgeAngle(row, col, 'up'), getEdgeWidth(row, col, 'up'));
    pg.vertex(x + w * 0.7, y);
    pg.vertex(x + w, y);
  }

  // Right edge
  if (right === 0) {
    pg.vertex(x + w, y + h);
  } else {
    pg.vertex(x + w, y + h * 0.3);
    drawTab(pg, x + w, y + h * 0.3, x + w, y + h * 0.7, right * tabSize, 'vertical', getEdgeAngle(row, col, 'right'), getEdgeWidth(row, col, 'right'));
    pg.vertex(x + w, y + h * 0.7);
    pg.vertex(x + w, y + h);
  }

  // Bottom edge
  if (down === 0) {
    pg.vertex(x, y + h);
  } else {
    pg.vertex(x + w * 0.7, y + h);
    drawTab(pg, x + w * 0.7, y + h, x + w * 0.3, y + h, down * tabSize, 'horizontal', getEdgeAngle(row, col, 'down'), getEdgeWidth(row, col, 'down'));
    pg.vertex(x + w * 0.3, y + h);
    pg.vertex(x, y + h);
  }

  // Left edge
  if (left === 0) {
    pg.vertex(x, y);
  } else {
    pg.vertex(x, y + h * 0.7);
    drawTab(pg, x, y + h * 0.7, x, y + h * 0.3, -left * tabSize, 'vertical', getEdgeAngle(row, col, 'left'), getEdgeWidth(row, col, 'left'));
    pg.vertex(x, y + h * 0.3);
    pg.vertex(x, y);
  }

  pg.endShape(CLOSE);
}

function drawTab(pg, x1, y1, x2, y2, offset, orientation, angleDeg = 0, widthMult = 1) {
  let edgeLength = (orientation === 'horizontal') ? Math.abs(x2 - x1) : Math.abs(y2 - y1);

  // Tab proportions with random width
  let baseWidth = 0.15; // Base stem width ratio
  let baseBulb = 0.35; // Base bulb radius ratio

  let stemWidth = edgeLength * baseWidth * widthMult;
  let bulbRadius = edgeLength * baseBulb * widthMult;
  let tabDepth = offset;
  let bulbStart = tabDepth * 0.3;

  // Convert angle to radians
  let angle = (angleDeg * Math.PI) / 180;

  // Rotation pivot at stem base
  let cx, cy;
  if (orientation === 'horizontal') {
    cx = (x1 + x2) / 2;
    cy = y1;
  } else {
    cx = x1;
    cy = (y1 + y2) / 2;
  }

  function rv(x, y) {
    return rotatePoint(x, y, cx, cy, angle);
  }

  // Horizontal tab
  if (orientation === 'horizontal') {
    let midX = (x1 + x2) / 2;
    let direction = x2 > x1 ? 1 : -1;

    let pts = [
      [midX - stemWidth * direction, y1 + bulbStart * 0.8, midX - stemWidth * direction, y1 + bulbStart * 0.9, midX - stemWidth * direction, y1 + bulbStart],
      [midX - stemWidth * direction, y1 + bulbStart + (tabDepth - bulbStart) * 0.3, midX - bulbRadius * 0.8 * direction, y1 + tabDepth * 0.6, midX - bulbRadius * direction, y1 + tabDepth * 0.9],
      [midX - bulbRadius * 0.6 * direction, y1 + tabDepth, midX + bulbRadius * 0.6 * direction, y1 + tabDepth, midX + bulbRadius * direction, y1 + tabDepth * 0.9],
      [midX + bulbRadius * 0.8 * direction, y1 + tabDepth * 0.6, midX + stemWidth * direction, y1 + bulbStart + (tabDepth - bulbStart) * 0.3, midX + stemWidth * direction, y1 + bulbStart],
      [midX + stemWidth * direction, y1 + bulbStart * 0.9,
      midX + stemWidth * direction, y1 + bulbStart * 0.7,
        x2, y2]
    ];

    for (let cp of pts) {
      let [x1r, y1r] = rv(cp[0], cp[1]);
      let [x2r, y2r] = rv(cp[2], cp[3]);
      let [x3r, y3r] = rv(cp[4], cp[5]);
      pg.bezierVertex(x1r, y1r, x2r, y2r, x3r, y3r);
    }
  }
  // Vertical tab
  else {
    let midY = (y1 + y2) / 2;
    let direction = y2 > y1 ? 1 : -1;

    let pts = [
      [x1 + bulbStart * 0.7, midY - stemWidth * direction, x1 + bulbStart * 0.9, midY - stemWidth * direction,
      x1 + bulbStart, midY - stemWidth * direction],
      [x1 + bulbStart + (tabDepth - bulbStart) * 0.3, midY - stemWidth * direction, x1 + tabDepth * 0.6, midY -
        bulbRadius * 0.8 * direction, x1 + tabDepth * 0.9, midY - bulbRadius * direction],
      [x1 + tabDepth, midY - bulbRadius * 0.6 * direction, x1 + tabDepth, midY + bulbRadius * 0.6 * direction,
      x1 + tabDepth * 0.9, midY + bulbRadius * direction],
      [x1 + tabDepth * 0.6, midY + bulbRadius * 0.8 * direction, x1 + bulbStart + (tabDepth - bulbStart) * 0.3,
      midY + stemWidth * direction, x1 + bulbStart, midY + stemWidth * direction],
      [x1 + bulbStart * 0.9, midY + stemWidth * direction, x1 + tabDepth * 0.15, midY + stemWidth * direction, x2, y2]
    ];

    for (let cp of pts) {
      let [x1r, y1r] = rv(cp[0], cp[1]);
      let [x2r, y2r] = rv(cp[2], cp[3]);
      let [x3r, y3r] = rv(cp[4], cp[5]);
      pg.bezierVertex(x1r, y1r, x2r, y2r, x3r, y3r);
    }
  }
}

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
  for (let i = pieces.length - 1; i >= 0; i--) {
    let p = pieces[i];
    let tabSize = min(pieceW, pieceH) * globalTabSize;

    // Calculate max extension for hit detection
    let maxExtendX = Math.max(
      p.col > 0 && getEdgeType(p.row, p.col, 'left') === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'left') : 0,
      p.col < cols - 1 && getEdgeType(p.row, p.col, 'right') === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'right') : 0
    );
    let maxExtendY = Math.max(
      p.row > 0 && getEdgeType(p.row, p.col, 'up') === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'up') : 0,
      p.row < rows - 1 && getEdgeType(p.row, p.col, 'down') === 1 ? tabSize * getEdgeWidth(p.row, p.col, 'down') : 0
    );

    if (
      mouseX > p.x - maxExtendX &&
      mouseX < p.x + pieceW + maxExtendX &&
      mouseY > p.y - maxExtendY &&
      mouseY < p.y + pieceH + maxExtendY
    ) {
      draggingPiece = i;
      draggingGroup = p.group.slice();
      offsetX = mouseX - p.x;
      offsetY = mouseY - p.y;
      break;
    }
  }
}

function mouseDragged() {
  if (draggingPiece !== null) {
    let basePiece = pieces[draggingPiece];
    let targetX = mouseX - offsetX;
    let targetY = mouseY - offsetY;
    let dx = targetX - basePiece.x;
    let dy = targetY - basePiece.y;

    // Get the group being moved
    let group = draggingGroup.map(i => pieces[i]);

    // Compute bounding box of the group
    let minX = min(group.map(p => p.x));
    let minY = min(group.map(p => p.y));
    let maxX = max(group.map(p => p.x + pieceW));
    let maxY = max(group.map(p => p.y + pieceH));

    // How far can the group move without going off the edges?
    let allowedDx = dx;
    let allowedDy = dy;

    if (minX + dx < 0) allowedDx = -minX;
    if (maxX + dx > width) allowedDx = width - maxX;
    if (minY + dy < 0) allowedDy = -minY;
    if (maxY + dy > height) allowedDy = height - maxY;

    // Apply only the allowed movement to all pieces in the group
    for (let p of group) {
      p.x += allowedDx;
      p.y += allowedDy;
    }
  }
}

function mouseReleased() {
  if (draggingPiece !== null) {
    for (let i of draggingGroup) checkSnap(i);
    draggingPiece = null;
    draggingGroup = [];
  }
}

function checkSnap(index) {
  const snapDist = 20;
  const pw = pieceW;
  const ph = pieceH;

  let piece = pieces[index];

  for (let dir in piece.neighbors) {
    let neighborIndex = piece.neighbors[dir];
    let neighbor = pieces[neighborIndex];
    if (!neighbor) continue;

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
      click.play();
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
}