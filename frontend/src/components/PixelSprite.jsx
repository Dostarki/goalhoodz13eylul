import React from 'react';

// 1-bit bitmap'i SVG olarak cizer. bitmap: string[] ('#' murekkep)
const PixelSprite = ({ bitmap, scale = 4, ink = 'currentColor', paper = 'transparent', invert = false, flip = false, className = '', style = {} }) => {
  const cols = bitmap[0].length;
  const rows = bitmap.length;
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = bitmap[r][c] === '#';
      if (invert ? !on : on) {
        rects.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />);
      }
    }
  }
  return (
    <svg
      className={className}
      style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }}
      width={cols * scale}
      height={rows * scale}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paper !== 'transparent' && <rect x={0} y={0} width={cols} height={rows} fill={paper} />}
      <g fill={ink}>{rects}</g>
    </svg>
  );
};

export default PixelSprite;
