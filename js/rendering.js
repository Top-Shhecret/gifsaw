// Rendering - frame caching, piece drawing

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

function drawPieceFast(i) {
  let p = pieces[i];
  let { extendLeft, extendUp } = p.extends;
  let frame = cachedFrames[currentFrame];
  if (!frame) return;
  let imgPiece = frame[i];
  image(imgPiece, p.x - extendLeft, p.y - extendUp);
  image(p.outline, p.x - extendLeft, p.y - extendUp);
}

function drawExclusionZone() {
  // No visual indicator - just used for piece placement
}
