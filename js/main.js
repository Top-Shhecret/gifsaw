// Main entry point - globals, preload, setup, draw, mouse events

// === GLOBALS ===
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

const rotationConst = 1;
const globalTabSize = 0.30;
const idealTotalPieces = 120;

let click;
let timerValue = 0;
let timerInterval;
let frameCounter = 0;

let releaseModeDrag = true;
let buttonText = "Select Mode";
let modeButton;

let local = false; // Testing

// === LIFECYCLE ===

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
    (windowWidth * windowHeight * 0.2) /
    (gif.width * gif.height)
  );

  let maxScaleWidth = windowWidth / gif.width;
  let maxScaleHeight = windowHeight / gif.height;

  let scaleFactor = min(areaScale, maxScaleWidth, maxScaleHeight);

  gif.resize(gif.width * scaleFactor, gif.height * scaleFactor);

  numFrames = max(1, gif.numFrames ? gif.numFrames() : 1);
  currentFrame = 0;

  let aspectRatio = gif.width / gif.height;
  rows = round(sqrt(idealTotalPieces / aspectRatio));
  cols = round(idealTotalPieces / rows);
  pieceW = gif.width / cols;
  pieceH = gif.height / rows;

  generateEdgeConfigs();
  initialisePieces();
  cacheAllFrames();
  numFrames = max(1, cachedFrames.length); // sync to what was actually cached

  timerInterval = setInterval(timeIt, 1000);

  modeButton = createButton(buttonText);
  modeButton.position(width - 100, 10);
  modeButton.mousePressed(changeMode);
}

function changeMode() {
  releaseModeDrag = buttonText === "Select Mode";
  buttonText = releaseModeDrag ? "Drag Mode" : "Select Mode";
  modeButton.html(buttonText);
}

function draw() {
  if (!cachedFrames.length) return;
  background(51);

  // Draw workspace indicator
  drawExclusionZone();

  fill(255);
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

// === MOUSE EVENTS ===

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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
