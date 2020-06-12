import { clamp, lerp, Vec2 } from "cc";
import { BlendTree } from "./AnimatorControllerAsset";
import { ExList } from "./ExtList";

let tmpPoint1: Vec2 = new Vec2();
let tmpPoint2: Vec2 = new Vec2();

export function fixPoint(v: { x: number, y: number }): Vec2 {
  v.x = v.x || 0;
  v.y = v.y || 0;
  return v as Vec2;
}

// function pointinTriangle(a: Vec2, b: Vec2, c: Vec2, p: Vec2): boolean {
//   let v0 = Vec2.subtract(tmpPoint1, c, a);
//   let v1 = Vec2.subtract(tmpPoint1, b, a);
//   let v2 = Vec2.subtract(tmpPoint1, p, a);

//   let dot00 = Vec2.dot(v0, v0);
//   let dot01 = Vec2.dot(v0, v1);
//   let dot02 = Vec2.dot(v0, v2);
//   let dot11 = Vec2.dot(v1, v1);
//   let dot12 = Vec2.dot(v1, v2);

//   let inverDeno = 1 / (dot00 * dot11 - dot01 * dot01);

//   let u = (dot11 * dot02 - dot01 * dot12) * inverDeno;
//   if (u < 0 || u > 1) // if u out of range, return directly
//   {
//     return false;
//   }

//   let v = (dot00 * dot12 - dot01 * dot02) * inverDeno;
//   if (v < 0 || v > 1) // if v out of range, return directly
//   {
//     return false;
//   }
//   return u + v <= 1;
// }

// function fastReturn(sample_point: Vec2, bt: BlendTree, weights: number[], weightsOffset: number): boolean {
//   let pointCount = bt.children.length;
//   if (pointCount === 0) {
//     return true;
//   }
//   if (pointCount === 1) {
//     weights[weightsOffset] = 1;
//     return true;
//   }
//   return false;
// }

let distancesToInput: ExList<number>;
// let angleDistancesToInput: ExList<number>;

export function sampleWeightsDirectional(samplePoint: Vec2, bt: BlendTree, weights: ExList<number>, weightsOffset: number) {
  let pointCount = bt.children.length;
  for (let j = 0; j < pointCount; j++) {
    weights[j + weightsOffset] = 0;
  }
  if (bt.children.length == 1) {
    weights[weightsOffset] = 1;
    return;
  }
  fixPoint(samplePoint);
  for (let i = 0; i < pointCount; i++) { // 在采样点上快速返回
    if (Vec2.equals(bt.children[i].position, samplePoint)) {
      weights[i + weightsOffset] = 1;
      return;
    }
  }

  if (bt.children.length == 2) {
    let l0 = Vec2.distance(samplePoint, bt.children[0].position);
    if (l0 == 0) {
      weights[weightsOffset] = 1;
      return;
    }
    let l1 = Vec2.distance(samplePoint, bt.children[1].position);
    weights[weightsOffset] = l0 / (l0 + l1);
    weights[weightsOffset + 1] = 1 - weights[weightsOffset];
    return;
  }

  let cachedInfo: { center: number, rads: { idx: number, rad: number, len: number }[] } = bt["_btDirectInfo"];
  let center = -1;
  let rads: { idx: number, rad: number, len: number }[];
  if (cachedInfo !== undefined) {
    center = cachedInfo.center;
    rads = cachedInfo.rads;
  } else {
    rads = [];
    bt.children.forEach((c, i) => {
      if (Vec2.equals(c.position, Vec2.ZERO)) {
        center = i;
        return;
      }
      rads.push({ idx: i, rad: Math.atan2(c.position.y, c.position.x), len: Vec2.len(c.position) });
    });
    rads.sort((a, b) => a.rad - b.rad);
    bt["_btDirectInfo"] = { center: center, rads: rads };
  }

  let radSamp = Math.atan2(samplePoint.y, samplePoint.x);
  let rp0: number, rp1: number; // 命中的两个采样点
  for (let i = rads.length; --i >= 0;) {
    if (radSamp >= rads[i].rad) {
      rp0 = i;
      rp1 = (i + 1) % rads.length;
      break;
    }
  }
  if (rp0 === undefined) {
    rp0 = rads.length - 1;
    rp1 = 0;
  }
  let deltaRad = rads[rp1].rad - rads[rp0].rad;
  if (deltaRad < 0) {
    deltaRad += Math.PI * 2;
  }

  if (deltaRad >= Math.PI) { // 命中采样点夹角大于等于pi,使用中心点
    if (center != -1) {
      weights[center + weightsOffset] = 1;
      return;
    }
    distancesToInput = distancesToInput || (distancesToInput = new ExList<number>(() => 0));
    distancesToInput.length = rads.length;
    let tdis = 0;
    rads.forEach((p, i) => {
      distancesToInput[i] = Vec2.distance(bt.children[p.idx].position, samplePoint);
      tdis += distancesToInput[i];
    });
    rads.forEach((p, i) => {
      weights[p.idx + weightsOffset] = distancesToInput[i] / tdis;
    });
    return
  }

  let t0 = Math.abs(rads[rp0].rad - radSamp);
  let t1 = Math.abs(rads[rp1].rad - radSamp);
  let w0 = 1 - ((t0 / (t0 + t1)) || 0);
  let w1 = 1 - w0;
  if (center >= 0) {
    let len01 = lerp(rads[rp0].len, rads[rp1].len, w1);
    let lenp = Vec2.len(samplePoint);
    if (lenp < len01) {
      let wc = 1 - lenp / len01;
      weights[center + weightsOffset] = wc;
      w0 *= (1 - wc);
      w1 *= (1 - wc);
    }
  }

  weights[rads[rp0].idx + weightsOffset] = w0;
  weights[rads[rp1].idx + weightsOffset] = w1;


  // if (fastReturn(samplePoint, bt, weights, weightsOffset)) {
  //   return;
  // }


  // let pointCount = bt.children.length;
  // let total_weight = 0.0;
  // fixPoint(samplePoint);

  // (sqrDistancesToInput || (sqrDistancesToInput = new ExList<number>(() => 0))).length = pointCount;
  // (angleDistancesToInput || (angleDistancesToInput = new ExList<number>(() => 0))).length = pointCount;
  // let sqrDistanceToInputSum = 0;
  // let angleDistanceToInputSum = 0;

  // let nsp = Vec2.copy(tmpPoint1, samplePoint).normalize();

  // for (let i = 0; i < pointCount; ++i) {
  //   let cp = fixPoint(bt.children[i].position);
  //   let currentSqrDistanceToInput = Vec2.subtract(tmpPoint1, samplePoint, cp).lengthSqr();
  //   if (currentSqrDistanceToInput <= 0) {
  //     for (let j = 0; j < pointCount; j++) {
  //       weights[j + weightsOffset] = 0;
  //     }
  //     weights[i + weightsOffset] = 1;
  //     return;
  //   }
  //   let currentAngleDistanceToInput = (clamp(Vec2.dot(nsp, Vec2.copy(tmpPoint2, cp).normalize()), -1, 1) - 1) * (-0.5);

  //   // 1/d1+1/d2+1/d3...
  //   sqrDistanceToInputSum += 1 / currentSqrDistanceToInput;

  //   if (currentAngleDistanceToInput > 0) {
  //     angleDistanceToInputSum += 1 / currentAngleDistanceToInput;
  //   }

  //   sqrDistancesToInput[i] = currentSqrDistanceToInput;
  //   angleDistancesToInput[i] = currentAngleDistanceToInput;
  // }


  // for (let i = 0; i < pointCount; i++) {

  //   // 1/d1 /(1/d1+1/d2+..1/dn)/1 => 1/(d1*(1/d1+1/d2+..1/dn))

  //   //(d1*(1/d1+1/d2+..1/dn))
  //   let currentSqrDistanceToInput = sqrDistanceToInputSum * sqrDistancesToInput[i];
  //   let currentAngleDistanceToInput = angleDistanceToInputSum * angleDistancesToInput[i];

  //   //1/(d1*(1/d1+1/d2+..1/dn))
  //   let weight = 0;
  //   if (currentSqrDistanceToInput > 0 && currentAngleDistanceToInput > 0) {
  //     weight = (1 / currentSqrDistanceToInput) * 0.5 + (1 / currentAngleDistanceToInput) * 0.5;
  //   } else if (currentSqrDistanceToInput > 0) {
  //     weight = (1 / currentSqrDistanceToInput) * 0.5 + 0.5;//have same direction so 0.5f
  //   }

  //   total_weight += weight;
  //   weights[i + weightsOffset] = weight;
  // }

  // for (let i = 0; i < pointCount; ++i) {
  //   weights[weightsOffset + i] /= total_weight;
  // }
}

export function sampleWeightsCartesian(sample_point: Vec2, bt: BlendTree, weights: ExList<number>, weightsOffset: number) {
  // if (fastReturn(sample_point, bt, weights, weightsOffset)) {
  //   return;
  // }
  let pointCount = bt.children.length;
  let total_weight = 0.0;
  fixPoint(sample_point);

  for (let i = 0; i < pointCount; ++i) {
    // Calc vec i -> sample
    let point_i = bt.children[i].position;
    let vec_is = Vec2.subtract(tmpPoint1, sample_point, point_i);

    let weight = 1.0;

    for (let j = 0; j < pointCount; ++j) {
      if (j == i)
        continue;

      // Calc vec i -> j
      let point_j = bt.children[j].position;
      let vec_ij = Vec2.subtract(tmpPoint2, point_j, point_i);

      // Calc Weight
      let lensq_ij = Vec2.dot(vec_ij, vec_ij);
      let new_weight = Vec2.dot(vec_is, vec_ij) / lensq_ij;
      new_weight = 1.0 - new_weight;
      new_weight = clamp(new_weight, 0.0, 1.0);

      weight = Math.min(weight, new_weight);
    }

    weights[weightsOffset + i] = weight;
    total_weight += weight;
  }

  for (let i = 0; i < pointCount; ++i) {
    weights[weightsOffset + i] /= total_weight;
  }
}

function signedAngle(a: Vec2, b: Vec2) {
  return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
}

export function sampleWeightsPolar(sample_point: Vec2, bt: BlendTree, weights: ExList<number>, weightsOffset: number) {
  // if (fastReturn(sample_point, bt, weights, weightsOffset)) {
  //   return;
  // }
  let pointCount = bt.children.length;
  const kDirScale = 2.0;
  let total_weight = 0.0;
  fixPoint(sample_point);

  let sample_mag = Vec2.len(sample_point);

  for (let i = 0; i < pointCount; ++i) {
    let point_i = bt.children[i].position as Vec2;
    let point_mag_i = Vec2.len(point_i);

    let weight = 1.0;

    for (let j = 0; j < pointCount; ++j) {
      if (j == i)
        continue;

      let point_j = bt.children[j].position as Vec2;
      let point_mag_j = Vec2.len(point_j);

      let ij_avg_mag = (point_mag_j + point_mag_i) * 0.5;

      // Calc angle and mag for i -> sample
      let mag_is = (sample_mag - point_mag_i) / ij_avg_mag;
      let angle_is = signedAngle(point_i, sample_point);

      // Calc angle and mag for i -> j
      let mag_ij = (point_mag_j - point_mag_i) / ij_avg_mag;
      let angle_ij = signedAngle(point_i, point_j);

      // Calc vec for i -> sample
      let vec_is = tmpPoint1;
      vec_is.x = mag_is;
      vec_is.y = angle_is * kDirScale;

      // Calc vec for i -> j
      let vec_ij = tmpPoint2;
      vec_ij.x = mag_ij;
      vec_ij.y = angle_ij * kDirScale;

      // Calc weight
      let lensq_ij = Vec2.dot(vec_ij, vec_ij);
      let new_weight = Vec2.dot(vec_is, vec_ij) / lensq_ij;
      new_weight = 1.0 - new_weight;
      new_weight = clamp(new_weight, 0.0, 1.0);

      weight = Math.min(new_weight, weight);
    }

    weights[i + weightsOffset] = weight;

    total_weight += weight;
  }

  for (let i = 0; i < pointCount; ++i) {
    weights[i + weightsOffset] /= total_weight;
  }
}