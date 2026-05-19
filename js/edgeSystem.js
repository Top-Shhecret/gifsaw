// Edge configuration system - tab types, directions, angles, widths

const TAB_TYPES = {
  classic:  { width: 0.15, bulb: 0.35 },
  wide:     { width: 0.22, bulb: 0.28 },
  narrow:   { width: 0.10, bulb: 0.40 },
  rounded:  { width: 0.18, bulb: 0.32 }
};

const TAB_TYPE_KEYS = Object.keys(TAB_TYPES);

function generateEdgeConfigs() {
  let hEdges = [], vEdges = [];
  let hAngles = [], vAngles = [];
  let hWidths = [], vWidths = [];
  let hTypes = [], vTypes = [];

  // Horizontal edges (between columns)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      hEdges.push(tabDir);
      hAngles.push(random(-rotationConst, rotationConst));
      hWidths.push(random(1, 1.4));
      hTypes.push(random(TAB_TYPE_KEYS));
    }
  }

  // Vertical edges (between rows)
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const tabDir = random() > 0.5 ? 1 : -1;
      vEdges.push(tabDir);
      vAngles.push(random(-rotationConst, rotationConst));
      vWidths.push(random(1, 1.4));
      vTypes.push(random(TAB_TYPE_KEYS));
    }
  }

  edgeConfigs = {
    h: hEdges, v: vEdges,
    hAngles, vAngles,
    hWidths, vWidths,
    hTypes, vTypes
  };
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

function getEdgeTabType(row, col, side) {
  if (side === 'left') return col === 0 ? 'classic' : edgeConfigs.hTypes[row * (cols - 1) + (col - 1)];
  if (side === 'right') return col === cols - 1 ? 'classic' : edgeConfigs.hTypes[row * (cols - 1) + col];
  if (side === 'up') return row === 0 ? 'classic' : edgeConfigs.vTypes[(row - 1) * cols + col];
  if (side === 'down') return row === rows - 1 ? 'classic' : edgeConfigs.vTypes[row * cols + col];
  return 'classic';
}
