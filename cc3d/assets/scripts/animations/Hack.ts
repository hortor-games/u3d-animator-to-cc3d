import { animation, AnimationState, Node } from "cc";

// hack sampleCurves to calc masked weight
(function () {
  Object.defineProperty(AnimationState.prototype, "_sampleCurves", {
    value: function (ratio: number) {
      // Before we sample, we pull values of common targets.
      for (let iCommonTarget = 0; iCommonTarget < this._commonTargetStatuses.length; ++iCommonTarget) {
        const commonTargetStatus = this._commonTargetStatuses[iCommonTarget];
        if (!commonTargetStatus) {
          continue;
        }
        commonTargetStatus.target.pull();
        commonTargetStatus.changed = false;
      }

      for (let iSamplerSharedGroup = 0, szSamplerSharedGroup = this._samplerSharedGroups.length;
        iSamplerSharedGroup < szSamplerSharedGroup; ++iSamplerSharedGroup) {
        const samplerSharedGroup = this._samplerSharedGroups[iSamplerSharedGroup];
        const sampler = samplerSharedGroup.sampler;
        const { samplerResultCache } = samplerSharedGroup;
        let index: number = 0;
        let lerpRequired = false;
        if (!sampler) {
          index = 0;
        } else {
          index = sampler.sample(ratio);
          if (index < 0) {
            index = ~index;
            if (index <= 0) {
              index = 0;
            } else if (index >= sampler.ratios.length) {
              index = sampler.ratios.length - 1;
            } else {
              lerpRequired = true;
              samplerResultCache.from = index - 1;
              samplerResultCache.fromRatio = sampler.ratios[samplerResultCache.from];
              samplerResultCache.to = index;
              samplerResultCache.toRatio = sampler.ratios[samplerResultCache.to];
              index = samplerResultCache.from;
            }
          }
        }

        for (let iCurveInstance = 0, szCurves = samplerSharedGroup.curves.length;
          iCurveInstance < szCurves; ++iCurveInstance) {
          const curveInstance = samplerSharedGroup.curves[iCurveInstance];

          let wt = this.weight;
          let bakWt = wt;
          let path = curveInstance._cachedPath || (curveInstance._cachedPath = curveInstance._curveDetail.modifiers[0].path.replace(curveInstance._rootTarget.name + "/", ""));
          if (this._maskInfo) {
            wt *= this._maskInfo[path] !== undefined ? this._maskInfo[path] : this._maskInfo["*"] || 0;
          }
          if (wt > 0) {
            this.weight = wt;
            curveInstance.applySample(ratio, index, lerpRequired, samplerResultCache, wt);
            this.weight = bakWt;
          }
          if (curveInstance.commonTargetIndex !== undefined) {
            const commonTargetStatus = this._commonTargetStatuses[curveInstance.commonTargetIndex];
            if (commonTargetStatus) {
              commonTargetStatus.changed = true;
            }
          }
        }
      }

      // After sample, we push values of common targets.
      for (let iCommonTarget = 0; iCommonTarget < this._commonTargetStatuses.length; ++iCommonTarget) {
        const commonTargetStatus = this._commonTargetStatuses[iCommonTarget];
        if (!commonTargetStatus) {
          continue;
        }
        if (commonTargetStatus.changed) {
          commonTargetStatus.target.push();
        }
      }
    }
  });
})();

// hack HierarchyPath prevent error
(function () {
  Object.defineProperty(animation.HierarchyPath.prototype, "get", {
    value: function (target: Node) {
      return target.getChildByPath(this.path);
    }
  })
})();