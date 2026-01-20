let gif;
let cols, rows;
let pieceW, pieceH;

let numFrames;
let currentFrame;

let pieces = [];
let edgeConfigs = [];
let cachedFrames = [];

let draggingPiece = null;
let draggingGroup = [];
let justSnapped = false;
let offsetX = 0;
let offsetY = 0;

const rotationConst = 1; //not even used
const globalTabSize = 0.30;
const idealTotalPieces = 120;
const dividingPieceScale = 1.3;

let click;
let timerValue = 0;
let timerInterval;
let frameCounter = 0;

let releaseModeDrag = true;
let buttonText = "Select Mode";
let modeButton;

let local = false; // Testing

function preload() {
  const params = new URLSearchParams(window.location.search);
  const gifUrl = params.get('gif_url');

  const url = gifUrl || 'https://media1.giphy.com/media/Y8dKrq2sDjQ5y/giphy.gif';

  if (!local) {
    gif = loadImage(url, () => console.log('GIF loaded'), (err) => console.error(err), { crossOrigin: '' });
  } else {
    gif = loadImage('puzzle.gif');
  }

  click = loadSound('click.mp3');
}

function timeIt() { timerValue++; }

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  textSize(50);
  
  let areaScale = sqrt(
    (windowWidth * windowHeight * 0.3) /
    (gif.width * gif.height)
  );

  // Clamping max and min so it stays on screen
  let maxScaleWidth  = windowWidth  / gif.width;
  let maxScaleHeight = windowHeight / gif.height;

  let scaleFactor = min(areaScale, maxScaleWidth, maxScaleHeight);
  scaleFactor = scaleFactor / dividingPieceScale
  gif.resize(gif.width * scaleFactor, gif.height * scaleFactor);

  numFrames = gif.numFrames ? gif.numFrames() : 1;
  currentFrame = 0;

  let aspectRatio = gif.width / gif.height;
  // sqrt used for 
  // cols = rows * aspectRatio
  // rows * (rows * aspectRatio) = idealTotalPieces
  rows = round(sqrt(idealTotalPieces / aspectRatio));
  cols = round(idealTotalPieces / rows);
  pieceW = gif.width / cols;
  pieceH = gif.height / rows;

  generateEdgeConfigs();
  initialisePieces();
  cacheAllFrames();

  timerInterval = setInterval(timeIt, 1000);

  modeButton = createButton(buttonText);
  modeButton.position(width - 100, 10);
  modeButton.mousePressed(changeMode);
}


function generateEdgeConfigs() {
  let hEdges = [], vEdges = [], hAngles = [], vAngles = [], hWidths = [], vWidths = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      hEdges.push(tabDir);
      hAngles.push(random(-rotationConst, rotationConst));
      hWidths.push(random(1, 1.4));
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      vEdges.push(tabDir);
      vAngles.push(random(-rotationConst, rotationConst));
      vWidths.push(random(1, 1.4));
    }
  }

  edgeConfigs = { h: hEdges, v: vEdges, hAngles, vAngles, hWidths, vWidths };
}

function cacheAllFrames() {
  cachedFrames = []; // reset
  for (let f = 0; f < numFrames; f++) {
    if (gif.numFrames) gif.setFrame(f);
    let frameImg = gif.get();
    let piecesImgs = [];
    for (let i = 0; i < pieces.length; i++) {
      let p = pieces[i];
      let { extendLeft, extendUp, bufferW, bufferH } = p.extends;
      let sx = p.col * pieceW - extendLeft;
      let sy = p.row * pieceH - extendUp;
      let imgPiece = frameImg.get(sx, sy, bufferW, bufferH);
      imgPiece.mask(p.mask);
      piecesImgs.push(imgPiece);
    }
    cachedFrames.push(piecesImgs);
  }
}


function changeMode() {
  releaseModeDrag = buttonText === "Select Mode";
  buttonText = releaseModeDrag ? "Drag Mode" : "Select Mode";
  modeButton.html(buttonText);
}

function initialisePieces() {
  const edgeThickness = min(width, height) * 0.20; // 20% border
  const totalPieces = cols * rows;
  let placedPositions = [];

  for (let i = 0; i < totalPieces; i++) {
    let randX, randY, overlaps, attempts = 0;
    do {
      const edge = floor(random(4)); // 0=top, 1=bottom, 2=left, 3=right

      switch (edge) {
        case 0: // top
          randX = random(width - pieceW);
          randY = random(edgeThickness - pieceH);
          break;

        case 1: // bottom
          randX = random(width - pieceW);
          randY = random(height - edgeThickness, height - pieceH);
          break;

        case 2: // left
          randX = random(edgeThickness - pieceW);
          randY = random(height - pieceH);
          break;

        case 3: // right
          randX = random(width - edgeThickness, width - pieceW);
          randY = random(height - pieceH);
          break;
      }

      overlaps = placedPositions.some(p => abs(randX - p.x) < pieceW * 1.2 && abs(randY - p.y) < pieceH * 1.2);
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

function updateFrameCache() {
  if (gif) {  
    cachedFrames[currentFrame] = pieces.map(p => {
      let { extendLeft, extendUp, bufferW, bufferH } = p.extends;
      let sx = p.col * pieceW - extendLeft;
      let sy = p.row * pieceH - extendUp; 
      let imgPiece = gif.get().get(sx, sy, bufferW, bufferH);
      imgPiece.mask(p.mask);
      return imgPiece;
    });
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
  mask.clear()
  mask.noStroke()
  drawPieceShape(mask, p.row, p.col, extendLeft, extendUp, pieceW, pieceH, leftType, rightType, upType, downType);

  let outline = createGraphics(bufferW, bufferH)
  outline.clear();
  outline.noFill();
  outline.stroke(0);
  outline.strokeWeight(1);
  drawPieceShape(outline, p.row, p.col, extendLeft, extendUp, pieceW, pieceH, leftType, rightType, upType, downType);

  p.mask = mask;
  p.outline = outline
  p.extends = { extendLeft, extendUp, bufferW, bufferH };
}

function getEdgeType(row, col, side) {
  if (side === 'left') return col === 0 ? 0 : -edgeConfigs.h[row * (cols - 1) + (col - 1)];
  if (side === 'right') return col === cols - 1 ? 0 : edgeConfigs.h[row * (cols - 1) + col];
  if (side === 'up') return row === 0 ? 0 : -edgeConfigs.v[(row - 1) * cols + col];
  if (side === 'down') return row === rows - 1 ? 0 : edgeConfigs.v[row * cols + col];
  return 0;
}

function getEdgeAngle(row, col, side) {
  if (side === 'left') return col === 0 ? 0 : edgeConfigs.hAngles[row * (cols - 1) + (col - 1)];
  if (side === 'right') return col === cols - 1 ? 0 : edgeConfigs.hAngles[row * (cols - 1) + col];
  if (side === 'up') return row === 0 ? 0 : edgeConfigs.vAngles[(row - 1) * cols + col];
  if (side === 'down') return row === rows - 1 ? 0 : edgeConfigs.vAngles[row * cols + col];
  return 0;
}

function getEdgeWidth(row, col, side) {
  if (side === 'left') return col === 0 ? 1 : edgeConfigs.hWidths[row * (cols - 1) + (col - 1)];
  if (side === 'right') return col === cols - 1 ? 1 : edgeConfigs.hWidths[row * (cols - 1) + col];
  if (side === 'up') return row === 0 ? 1 : edgeConfigs.vWidths[(row - 1) * cols + col];
  if (side === 'down') return row === rows - 1 ? 1 : edgeConfigs.vWidths[row * cols + col];
  return 1;
}

function draw() {
  background(51);
  fill(255)
  text(hours(timerValue) + ':' + nf(minutes(timerValue), 2) + ':' + nf(seconds(timerValue), 2), width - 100, 100);
  if (local) text('fps: ' + nf(frameRate(), 2, 0), width - 100, 300);

  frameCounter++;
  if (frameCounter % 4 === 0) {
    currentFrame = (currentFrame + 1) % numFrames;
    if (gif.numFrames) gif.setFrame(currentFrame);
    frameCounter = 0;
  }

  for (let i = 0; i < pieces.length; i++) {
    if (draggingPiece !== null && draggingGroup.includes(i)) continue;
    drawPieceFast(i);
  }

  dragging();

  if (draggingPiece !== null) {
    for (let i of draggingGroup) {
      drawPieceFast(i);
      checkSnap(i);
    }
  }
  justSnapped = false;
}

function hours(t) { return floor(t / 3600); }
function minutes(t) { return floor((t % 3600) / 60); }
function seconds(t) { return t % 60; }

function drawPieceFast(i) {
  let p = pieces[i];
  let { extendLeft, extendUp } = p.extends;
  let imgPiece = cachedFrames[currentFrame][i];
  image(imgPiece, p.x - extendLeft, p.y - extendUp);
  image(p.outline, p.x - extendLeft, p.y - extendUp);
}

function drawPieceShape(pg, row, col, x, y, w, h, left, right, up, down) {
  let tabSize = min(w, h) * globalTabSize;
  pg.beginShape();
  pg.vertex(x, y);

  if (up !== 0) { pg.vertex(x + w * 0.3, y); drawTab(pg, x + w * 0.3, y, x + w * 0.7, y, -up * tabSize, 'horizontal', getEdgeAngle(row, col, 'up'), getEdgeWidth(row, col, 'up')); pg.vertex(x + w * 0.7, y); }
  pg.vertex(x + w, y);

  if (right !== 0) { pg.vertex(x + w, y + h * 0.3); drawTab(pg, x + w, y + h * 0.3, x + w, y + h * 0.7, right * tabSize, 'vertical', getEdgeAngle(row, col, 'right'), getEdgeWidth(row, col, 'right')); pg.vertex(x + w, y + h * 0.7); }
  pg.vertex(x + w, y + h);

  if (down !== 0) { pg.vertex(x + w * 0.7, y + h); drawTab(pg, x + w * 0.7, y + h, x + w * 0.3, y + h, down * tabSize, 'horizontal', getEdgeAngle(row, col, 'down'), getEdgeWidth(row, col, 'down')); pg.vertex(x + w * 0.3, y + h); }
  pg.vertex(x, y + h);

  if (left !== 0) { pg.vertex(x, y + h * 0.7); drawTab(pg, x, y + h * 0.7, x, y + h * 0.3, -left * tabSize, 'vertical', getEdgeAngle(row, col, 'left'), getEdgeWidth(row, col, 'left')); pg.vertex(x, y + h * 0.3); }

  pg.endShape(CLOSE);
}

// --- Dragging, Tab, Snapping, Mouse Events ---

function rotatePoint(px, py, cx, cy, angle) {
  let s = sin(angle), c = cos(angle);
  px -= cx; py -= cy;
  let xnew = px * c - py * s, ynew = px * s + py * c;
  return [xnew + cx, ynew + cy];
}

function drawTab(pg, x1, y1, x2, y2, offset, orientation, angleDeg = 0, widthMult = 1) {
  let edgeLength = orientation === 'horizontal' ? abs(x2 - x1) : abs(y2 - y1);
  let baseWidth = 0.15, baseBulb = 0.35;
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

function mousePressed() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();

  if (draggingPiece !== null) {
    draggingPiece = null;
    draggingGroup = [];
    return;
  }

  for (let i = pieces.length - 1; i >= 0; i--) {
    let p = pieces[i];
    let tabSize = min(pieceW, pieceH) * globalTabSize;

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

function mouseReleased() {
  if (!releaseModeDrag) return;

  if (draggingPiece !== null) {
    for (let i of draggingGroup) checkSnap(i);
    draggingPiece = null;
    draggingGroup = [];
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

    // Check which piece is moving to snap it to stationary pieces.
    if (dist < snapDist) {
      const pieceIsDragged = draggingGroup.includes(piece.index);
      if (pieceIsDragged) {
        // Move dragged piece to stationary neighbor
        alignGroups(neighbor.index, piece.index, oppositeDir(dir));
        mergeGroups(neighbor.index, piece.index);
      } else {
        // Move dragged neighbor to stationary piece
        alignGroups(piece.index, neighbor.index, dir);
        mergeGroups(piece.index, neighbor.index);
      }
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

// Helper function used for snapping to stationary pieces
function oppositeDir(dir) {
  if (dir === "left") return "right";
  if (dir === "right") return "left";
  if (dir === "up") return "down";
  if (dir === "down") return "up";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
