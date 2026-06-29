import * as THREE from 'three';

export interface ArcParams {
  valid:    boolean;
  radius:   number;
  theta:    number;
  sinTheta: number;
  rAux:     number;
  rAuy:     number;
  rAuz:     number;
  rBux:     number;
  rBuy:     number;
  rBuz:     number;
}

export interface ArcEndpoint {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

const _rA = new THREE.Vector3();
const _rB = new THREE.Vector3();

export function arcParams(
  from:   THREE.Vector3,
  to:     THREE.Vector3,
  center: THREE.Vector3,
  out:    ArcParams,
): ArcParams {
  _rA.subVectors(from, center);
  _rB.subVectors(to,   center);
  const radius = _rA.length();
  const rBLen  = _rB.length();

  if (radius < 0.001 || rBLen < 0.001) {
    out.valid = false;
    return out;
  }

  const rAux = _rA.x / radius, rAuy = _rA.y / radius, rAuz = _rA.z / radius;
  const rBux = _rB.x / rBLen,  rBuy = _rB.y / rBLen,  rBuz = _rB.z / rBLen;

  const dot   = Math.max(-1, Math.min(1, rAux * rBux + rAuy * rBuy + rAuz * rBuz));
  const theta = Math.acos(dot);

  if (theta < 0.001) {
    out.valid = false;
    return out;
  }

  out.valid    = true;
  out.radius   = radius;
  out.theta    = theta;
  out.sinTheta = Math.sin(theta);
  out.rAux     = rAux;
  out.rAuy     = rAuy;
  out.rAuz     = rAuz;
  out.rBux     = rBux;
  out.rBuy     = rBuy;
  out.rBuz     = rBuz;
  return out;
}

export function writeArcTube(
  positions:   Float32Array,
  params:      ArcParams,
  center:      THREE.Vector3,
  segments:    number,
  radial:      number,
  shaftRadius: number,
  outLast:     ArcEndpoint,
): ArcEndpoint {
  const { radius, theta, sinTheta, rAux, rAuy, rAuz, rBux, rBuy, rBuz } = params;
  const Cx = center.x, Cy = center.y, Cz = center.z;

  for (let i = 0; i <= segments; i++) {
    const ti = i / segments;
    const w1 = Math.sin((1 - ti) * theta) / sinTheta;
    const w2 = Math.sin(ti * theta) / sinTheta;

    // Arc position (SLERP — guaranteed unit direction × radius)
    const px = Cx + radius * (w1 * rAux + w2 * rBux);
    const py = Cy + radius * (w1 * rAuy + w2 * rBuy);
    const pz = Cz + radius * (w1 * rAuz + w2 * rBuz);

    // Centripetal inward normal — unit by SLERP property, no normalisation needed
    const nux = -(w1 * rAux + w2 * rBux);
    const nuy = -(w1 * rAuy + w2 * rBuy);
    const nuz = -(w1 * rAuz + w2 * rBuz);

    // Tangent — derivative of SLERP, then normalise
    const dw1 = -Math.cos((1 - ti) * theta);
    const dw2 =  Math.cos(ti * theta);
    let tx = dw1 * rAux + dw2 * rBux;
    let ty = dw1 * rAuy + dw2 * rBuy;
    let tz = dw1 * rAuz + dw2 * rBuz;
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (tLen > 0.0001) { tx /= tLen; ty /= tLen; tz /= tLen; }

    // Binormal = tangent × normal
    const bx = ty * nuz - tz * nuy;
    const by = tz * nux - tx * nuz;
    const bz = tx * nuy - ty * nux;

    // Tube ring vertices
    for (let j = 0; j <= radial; j++) {
      const ang = (j / radial) * Math.PI * 2;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const vi = (i * (radial + 1) + j) * 3;
      positions[vi]     = px + shaftRadius * (cos * nux + sin * bx);
      positions[vi + 1] = py + shaftRadius * (cos * nuy + sin * by);
      positions[vi + 2] = pz + shaftRadius * (cos * nuz + sin * bz);
    }

    if (i === segments) {
      outLast.px = px; outLast.py = py; outLast.pz = pz;
      outLast.tx = tx; outLast.ty = ty; outLast.tz = tz;
    }
  }

  return outLast;
}
