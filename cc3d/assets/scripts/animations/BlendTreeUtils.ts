import {BlendTree} from "./AnimatorControllerAsset";
import {clamp, Vec2} from "cc";
import {ExList} from "./RuntimeAnimatorController";

let tmpPoint1: Vec2 = new Vec2();
let tmpPoint2: Vec2 = new Vec2();

function fixPoint(v): Vec2 {
  v.x = v.x || 0;
  v.y = v.y || 0;
  return v;
}

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

let sqrDistancesToInput: ExList<number>;
let angleDistancesToInput: ExList<number>;

export function sampleWeightsDirectional(samplePoint: Vec2, bt: BlendTree, weights: ExList<number>, weightsOffset: number) {
  // if (fastReturn(samplePoint, bt, weights, weightsOffset)) {
  //   return;
  // }
  let pointCount = bt.children.length;
  let total_weight = 0.0;
  fixPoint(samplePoint);

  (sqrDistancesToInput || (sqrDistancesToInput = new ExList<number>(() => 0))).length = pointCount;
  (angleDistancesToInput || (angleDistancesToInput = new ExList<number>(() => 0))).length = pointCount;
  let sqrDistanceToInputSum = 0;
  let angleDistanceToInputSum = 0;

  let nsp = Vec2.copy(tmpPoint1, samplePoint).normalize();

  for (let i = 0; i < pointCount; ++i) {
    let cp = fixPoint(bt.children[i].position);
    let currentSqrDistanceToInput = Vec2.subtract(tmpPoint1, samplePoint, cp).lengthSqr();
    if (currentSqrDistanceToInput <= 0) {
      for (let j = 0; j < pointCount; j++) {
        weights[j + weightsOffset] = 0;
      }
      weights[i + weightsOffset] = 1;
      return;
    }
    let currentAngleDistanceToInput = (clamp(Vec2.dot(nsp, Vec2.copy(tmpPoint2, cp).normalize()), -1, 1) - 1) * (-0.5);

    // 1/d1+1/d2+1/d3...
    sqrDistanceToInputSum += 1 / currentSqrDistanceToInput;

    if (currentAngleDistanceToInput > 0) {
      angleDistanceToInputSum += 1 / currentAngleDistanceToInput;
    }

    sqrDistancesToInput[i] = currentSqrDistanceToInput;
    angleDistancesToInput[i] = currentAngleDistanceToInput;
  }


  for (let i = 0; i < pointCount; i++) {

    // 1/d1 /(1/d1+1/d2+..1/dn)/1 => 1/(d1*(1/d1+1/d2+..1/dn))

    //(d1*(1/d1+1/d2+..1/dn))
    let currentSqrDistanceToInput = sqrDistanceToInputSum * sqrDistancesToInput[i];
    let currentAngleDistanceToInput = angleDistanceToInputSum * angleDistancesToInput[i];

    //1/(d1*(1/d1+1/d2+..1/dn))
    let weight = 0;
    if (currentSqrDistanceToInput > 0 && currentAngleDistanceToInput > 0) {
      weight = (1 / currentSqrDistanceToInput) * 0.5 + (1 / currentAngleDistanceToInput) * 0.5;
    } else if (currentSqrDistanceToInput > 0) {
      weight = (1 / currentSqrDistanceToInput) * 0.5 + 0.5;//have same direction so 0.5f
    }

    total_weight += weight;
    weights[i + weightsOffset] = weight;
  }

  for (let i = 0; i < pointCount; ++i) {
    weights[weightsOffset + i] /= total_weight;
  }
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
    let point_i = fixPoint(bt.children[i].position);
    let vec_is = Vec2.subtract(tmpPoint1, sample_point, point_i);

    let weight = 1.0;

    for (let j = 0; j < pointCount; ++j) {
      if (j == i)
        continue;

      // Calc vec i -> j
      let point_j = fixPoint(bt.children[j].position);
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
    let point_i = fixPoint(bt.children[i].position);
    let point_mag_i = Vec2.len(point_i);

    let weight = 1.0;

    for (let j = 0; j < pointCount; ++j) {
      if (j == i)
        continue;

      let point_j = fixPoint(bt.children[j].position);
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