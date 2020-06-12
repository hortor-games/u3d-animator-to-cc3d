import {
  AnimationClip,
  AnimatorConditionMode,
  AnimatorController,
  AnimatorControllerLayer,
  AnimatorControllerParameter,
  AnimatorControllerParameterType,
  AnimatorState,
  AnimatorStateMachine,
  AnimatorStateTransition,
  BlendTree,
  BlendTreeType,
  TransitionInterruptionSource,
  Vec2,
  AnimatorLayerBlendingMode
} from "./AnimatorControllerAsset";
import { clamp01, log } from "cc";
import { sampleWeightsCartesian, sampleWeightsDirectional, sampleWeightsPolar, fixPoint } from "./BlendTreeUtils";
import { ExList } from "./ExtList";

export interface IAnimationSource {
  getClipDuration(name: string): number;
}

export type BlendInfo = {
  clip: string;
  weight: number;
  time: number;
  duration: number;
  timeScale: number;
}

export type LayerBlendInfo = {
  weight: number;
  maskInfo: { [idx: string]: number };
  infos: ExList<BlendInfo>;
  idx: number;
}


export class RuntimeAnimatorController {
  asset: AnimatorController;
  animationSource: IAnimationSource;
  onStateMachineEvent: (evt: string, sm: AnimatorStateMachine) => void;
  onStateEvent: (evt: string, s: RuntimeAnimatorState) => void;
  private _blendInfo: LayerBlendInfo[];
  private blendInfoDirty = true;

  // get blendInfo(): ExList<BlendInfo> {
  //   if (this.blendInfoDirty) {
  //     this.blendInfoDirty = false;
  //     let infoList = this._blendInfo;
  //     infoList.reset();
  //     this.layers.forEach(layer => {
  //       let idx = infoList.length;
  //       infoList.length += layer.curState.blendInfo.length;
  //       layer.curState.blendInfo.forEach((info, i) => {
  //         info.weight *= layer.asset.defaultWeight || 0;
  //         if (info.weight === 0) {
  //           return true;
  //         }
  //         infoList[idx++] = info;
  //         return true;
  //       });
  //       infoList.length = idx;
  //     });
  //   }
  //   return this._blendInfo;
  // }

  get blendInfo(): LayerBlendInfo[] {
    if (!this.blendInfoDirty) {
      return this._blendInfo;
    }
    this.blendInfoDirty = false;

    //计算缓存key
    let cacheKey = 0;
    this.layers.forEach((layer, li) => {
      if (!layer.asset.defaultWeight) {
        return;
      }
      layer.curState.blendInfo.forEach((info, i) => {
        if (info.weight === 0 || info.duration === 0) {
          return;
        }
        cacheKey |= 1 << li;
        return false;
      });
    });
    let lbis: LayerBlendInfo[] = (this.asset["_blendInfos"] || (this.asset["_blendInfos"] = {}))[cacheKey];
    if (!lbis) { // 创建新的blend信息
      lbis = [];
      this.asset["_blendInfos"][cacheKey] = lbis;

      let allMaskBones = [];// 统计所有被使用过的mask骨骼
      this.layers.forEach((layer, li) => {
        if (!(cacheKey & (1 << li))) {
          return;
        }
        lbis.push({ idx: li, maskInfo: {}, weight: layer.asset.defaultWeight, infos: new ExList<BlendInfo>(() => null) });
        let lAsset = layer.asset;
        if (lAsset.avatarMask && lAsset.avatarMask.length > 0) {
          allMaskBones.push(...lAsset.avatarMask);
        }
      })

      //计算每个参与mask的骨骼在对应层的权重
      let boneWeightCache = {};
      allMaskBones.forEach(bone => {
        let boneCacheKey = 0; // 相同mask层级关系的骨骼直接使用缓存
        lbis.forEach((lbi, i) => {
          let lAsset = this.layers[lbi.idx].asset;
          boneCacheKey |= !lAsset.avatarMaskSet || lAsset.avatarMaskSet.has(bone) ? 1 << lbi.idx : 0;
        });
        let bwc = boneWeightCache[boneCacheKey];
        if (bwc !== undefined) {
          lbis.forEach(lbi => lbi.maskInfo[bone] = lbi.maskInfo[bwc]);
          return;
        }
        boneWeightCache[boneCacheKey] = bone;

        // 计算骨骼权重
        let twt = 0;
        let override = false;
        for (let i = lbis.length; --i >= 0;) {
          let lbi = lbis[i];
          if (override) {
            lbi.maskInfo[bone] = 0;
            continue;
          }
          let layer = this.layers[lbi.idx].asset;
          if (boneCacheKey & (1 << lbi.idx)) {
            lbi.maskInfo[bone] = lbi.weight;
            twt += lbi.weight;
            override = ~~layer.blendingMode == AnimatorLayerBlendingMode.Override;
          }
        }
        lbis.forEach(lbi => lbi.maskInfo[bone] = (lbi.maskInfo[bone] || 0) / twt);
      });
      //计算其他骨骼在对应层的权重
      let override = false;
      let twt = 0;
      for (let i = lbis.length; --i >= 0;) {
        let lbi = lbis[i];
        if (override) {
          lbi.maskInfo["*"] = 0;
          continue;
        }
        let layer = this.layers[lbi.idx].asset;
        if (!layer.avatarMask) {
          lbi.maskInfo["*"] = lbi.weight;
          twt += lbi.weight;
          override = ~~layer.blendingMode == AnimatorLayerBlendingMode.Override;
        }
      }
      lbis.forEach(lbi => lbi.maskInfo["*"] = (lbi.maskInfo["*"] || 0) / twt);
    }

    // 填充权重
    lbis.forEach(lbi => {
      let layer = this.layers[lbi.idx];
      lbi.infos.reset();
      let twt = 0;
      layer.curState.blendInfo.forEach(info => {
        if (info.weight === 0 || info.duration == 0) {
          return;
        }
        lbi.infos.add(info);
        twt += info.weight;
      });
      if (twt !== 1) {
        lbi.infos.forEach(p => {
          p.weight /= twt;
        });
      }
    });
    return lbis;
  }

  get parameters(): AnimatorControllerParameter[] {
    return this.asset.parameters;
  }

  private parameterValues: { [idx: string]: number | boolean } = {};

  layers: RuntimeAnimatorControllerLayer[];
  private layersNameMap: { [idx: string]: RuntimeAnimatorControllerLayer };

  constructor(animationSource: IAnimationSource, src: AnimatorController | any) {
    this.animationSource = animationSource;
    this.asset = src;
    this.preprocessAsset(src);

    this.layers = this.asset.layers.map(layer => new RuntimeAnimatorControllerLayer(this, layer));
    this.layersNameMap = {};
    this.layers.forEach(l => this.layersNameMap[l.asset.name] = l);
  }

  private preprocessAsset(src: AnimatorController) {
    if (src.processed) {
      return;
    }
    src.processed = true;
    src.parametersMap = {};
    src.parameters.forEach(p => {
      src.parametersMap[p.name] = p;
      this.parameterValues[p.name] = p.defaultValue;
    });

    src.stateMachinesHashMap = {};
    src.statesHashMap = {};
    src.stateMachinesNameMap = {};
    src.statesNameMap = {};

    src.layers.forEach((layer, i) => {
      layer.idx = i;
      if (layer.avatarMask) {
        layer.avatarMaskSet = new Set(layer.avatarMask);
      }
      layer.stateMachines.forEach(sm => {
        src.stateMachinesHashMap[sm.id] = sm;
      });
      layer.states.forEach(s => {
        src.statesHashMap[s.id] = s;
      });
      layer.stateMachine = src.stateMachinesHashMap[<any>layer.stateMachine];
    });

    src.layers.forEach((layer, i) => {
      let processTrans = t => {
        t.destinationState = src.statesHashMap[<any>t.destinationState];
        t.destinationStateMachine = src.stateMachinesHashMap[<any>t.destinationStateMachine];
      };
      let addStateMachine;
      addStateMachine = (sm: AnimatorStateMachine, parent: AnimatorStateMachine, fullPath: string) => {
        fullPath = sm.fullPath = (fullPath ? fullPath + "." + sm.name : sm.name);
        src.stateMachinesNameMap[fullPath] = sm;
        sm.layer = layer;
        sm.defaultState = src.statesHashMap[<any>sm.defaultState];
        // if (parent) {
        //   parent.stateMachinesMap[sm.name] = sm;
        // }
        sm.stateMachines.forEach((id, i) => {
          sm.stateMachines[i] = src.stateMachinesHashMap[<any>id];
        });
        sm.parent = parent;
        // sm.statesMap = {};
        sm.states.forEach((id, i) => {
          let state = sm.states[i] = src.statesHashMap[<any>id];
          src.statesNameMap[state.fullPath = (fullPath + "." + state.name)] = state;
          state.stateMachine = sm;
          if (state.motion && state.motion.type === 1) {
            let bt = state.motion as BlendTree;
            bt.blendType = ~~bt.blendType;
            if (bt.blendType > BlendTreeType.Simple1D && bt.blendType < BlendTreeType.Direct) {
              bt.children.forEach(c => fixPoint(c.position));
            }
          }
          // sm.statesMap[state.name] = state;
          state.transitions.forEach(t => processTrans(t));
        });
        sm.stateMachines.forEach(sm2 => addStateMachine(sm2, sm, fullPath));
        sm.anyStateTransitions.forEach(t => processTrans(t));
      };
      addStateMachine(layer.stateMachine, null, "");
    });
  }

  get overrids(): { [idx: string]: string } {
    return this.asset.overrides;
  }

  getStateByFullPath(name: string): AnimatorState {
    return this.asset.statesNameMap[name];
  }

  getStateMachineByFullPath(name: string): AnimatorStateMachine {
    return this.asset.stateMachinesNameMap[name];
  }

  getNumber(name: string): number {
    return <number>this.parameterValues[name] || 0;
  }

  getBool(name: string): boolean {
    return !!this.parameterValues[name];
  }

  setParameter(name: string, value: number | boolean) {
    this.parameterValues[name] = value;
  }

  getParameterAsset(name: string): AnimatorControllerParameter {
    return this.asset.parametersMap[name];
  }

  setTrigger(name: string) {
    this.parameterValues[name] = true;
  }

  update(dt: number) {
    this.blendInfoDirty = true;
    this.layers.forEach(p => p.update(dt));
  }

  play(stateName: string, normalizedTime: number = 0) {
    let l = this.layersNameMap[stateName.split(".")[0]];
    if (!l) {
      return;
    }
    l.play(stateName, normalizedTime);
  }

  crossFade(stateName: string, hasFixedDuration: boolean, transitionDuration: number, timeOffset: number = 0, normalizedTransitionTime: number = 0) {
    let l = this.layersNameMap[stateName.split(".")[0]];
    if (!l) {
      return;
    }
    l.crossFade(stateName, hasFixedDuration, transitionDuration, timeOffset, normalizedTransitionTime);
  }
}

class RuntimeAnimatorControllerLayer {
  ctr: RuntimeAnimatorController;
  asset: AnimatorControllerLayer;
  curState: RuntimeAnimatorState; // 当前状态
  midState: RuntimeAnimatorState; // 中间状态
  nextState: RuntimeAnimatorState; // 下一个状态

  private static readonly STEP_INIT = 0;
  private static readonly STEP_RUN = 1;
  private static readonly STEP_TRANS = 2;
  private step: number = 0;
  private nextStep = 0;
  private tick: number;

  constructor(ctr: RuntimeAnimatorController, asset: AnimatorControllerLayer) {
    this.ctr = ctr;
    this.asset = asset;
    this.curState = new RuntimeAnimatorState(this);
    this.curState.initForCurState();
    this.nextState = new RuntimeAnimatorState(this, true);
    this.midState = new RuntimeAnimatorState(this, true);
  }

  getFirstState(sm: AnimatorStateMachine): AnimatorState {
    return sm && sm.defaultState;
  }

  private _tmpTrans: AnimatorStateTransition;
  private get tmpTrans(): AnimatorStateTransition {
    return this._tmpTrans || (this._tmpTrans = <any>{});
  }

  play(stateName: string, normalizedTime: number) {
    let state = this.ctr.asset.statesNameMap[stateName];
    if (!state) {
      return;
    }
    if (state === this.curState.asset) {
      this.midState.time = this.curState.time = normalizedTime;
      return;
    }
    let tmpTrans = this.tmpTrans;
    tmpTrans.duration = 0;
    this.curState.curTrans.reset(this.curState, tmpTrans);
    this.nextState.reset(state);
    this.nextStep = RuntimeAnimatorControllerLayer.STEP_RUN;
    this.update(0);
  }

  crossFade(stateName: string, hasFixedDuration: boolean, transitionDuration: number, timeOffset: number = 0, normalizedTransitionTime: number = 0) {
    let state = this.ctr.asset.statesNameMap[stateName];
    if (!state) {
      return;
    }
    let tmpTrans = this.tmpTrans;
    tmpTrans.hasFixedDuration = hasFixedDuration;
    tmpTrans.duration = transitionDuration;
    tmpTrans.offset = timeOffset;
    tmpTrans.destinationState = state;
    this.curState.curTrans.reset(this.curState, tmpTrans);
    this.curState.transTime = normalizedTransitionTime;
    this.nextState.reset(state);
    this.nextStep = RuntimeAnimatorControllerLayer.STEP_TRANS;
    this.update(0);
  }


  update(dt: number) {
    let loop = 0;
    do {
      if (loop++ > 10) {
        log("may be a dead loop");
        break;
      }
      let useTime = 0;
      this.tick++;
      if (this.nextStep >= 0) {
        this.tick = 0;
        this.step = this.nextStep;
        this.nextStep = -1;
        switch (this.step) {
          case RuntimeAnimatorControllerLayer.STEP_INIT:
            useTime = this.onInit(dt);
            break;
          case RuntimeAnimatorControllerLayer.STEP_RUN:
            useTime = this.onRun(dt);
            break;
        }
      }
      dt -= useTime;
      useTime = 0;

      switch (this.step) {
        case RuntimeAnimatorControllerLayer.STEP_RUN:
          useTime = this.onRunUpdate(dt);
          break;
        case RuntimeAnimatorControllerLayer.STEP_TRANS: {
          useTime = this.onTransUpdate(dt);
          break;
        }
      }

      dt -= useTime;
      useTime = 0;
    } while (this.nextStep >= 0);
  }

  private onInit(dt: number): number {
    this.nextState.reset(this.getFirstState(this.asset.stateMachine));
    if (!this.nextState.isValid) {
      this.step = -1;
      return dt;
    }
    this.nextStep = RuntimeAnimatorControllerLayer.STEP_RUN;
    return dt;
  }

  private onRun(dt: number): number {
    let toSM: AnimatorStateMachine;
    if (this.curState.isValid) {
      this.ctr.onStateEvent && this.ctr.onStateEvent("onStateExit", this.curState);
      if (this.curState.curTrans.asset.isExit) {
        this.ctr.onStateMachineEvent && this.ctr.onStateMachineEvent("onStateMachineExit", this.curState.asset.stateMachine);
      }
      toSM = this.curState.curTrans.asset.destinationStateMachine;
    }
    this.curState.reset(this.nextState.asset);
    this.midState.reset(this.curState.asset);
    this.curState.time = this.midState.time = this.nextState.time;
    this.nextState.clear();
    this.curState.curTrans.clear();

    if (toSM) {
      this.ctr.onStateMachineEvent && this.ctr.onStateMachineEvent("onStateMachineEnter", toSM);
    }
    this.ctr.onStateEvent && this.ctr.onStateEvent("onStateEnter", this.curState);

    log("切换状态", this.curState.asset.stateMachine.name + "." + this.curState.asset.name);
    return 0;
  }

  private onRunUpdate(dt: number): number {
    let useTime = this.curState.updateRun(dt);
    if (this.curState.needTrans) {
      this.nextStep = RuntimeAnimatorControllerLayer.STEP_TRANS;
    }
    this.tick > 0 && this.ctr.onStateEvent && this.ctr.onStateEvent("onStateUpdate", this.curState);
    return useTime;
  }

  private onTransUpdate(dt: number): number {
    let useTime = this.curState.updateTrans(dt);
    if (this.curState.needChange) {
      this.nextStep = RuntimeAnimatorControllerLayer.STEP_RUN;
    } else {
      this.ctr.onStateEvent && this.ctr.onStateEvent("onStateUpdate", this.curState);
    }
    return useTime;
  }
}

class RuntimeAnimatorState {
  layer: RuntimeAnimatorControllerLayer;
  asset: AnimatorState;
  transitions: ExList<RuntimeAnimatorStateTransition>;
  private transitionsDirty: boolean;
  curTrans: RuntimeAnimatorStateTransition;
  time: number = 0;// 动画播放归一化时间
  nextTime: number = 0; // 预计算下一帧动画播放归一化时间
  blendInfo: ExList<BlendInfo>;// = new ExList<BlendInfo>(() => <any>{});
  private readonly weights: ExList<number>;// = new ExList<number>(() => 0);

  get ctr(): RuntimeAnimatorController {
    return this.layer.ctr;
  }

  get isValid(): boolean {
    return !!this.asset;
  }

  get needTrans(): boolean {
    return this.curTrans.isValid && this.nextState.isValid;
  }

  private get midState(): RuntimeAnimatorState {
    return this.layer.midState;
  }

  private get nextState(): RuntimeAnimatorState {
    return this.layer.nextState;
  }

  needChange: boolean = false;
  transTime: number = 0;
  interrupted: boolean = false;
  private transChanged: boolean;

  constructor(layer: RuntimeAnimatorControllerLayer, initWeights: boolean = false) {
    this.layer = layer;
    if (initWeights) {
      this.blendInfo = new ExList<BlendInfo>(() => <any>{});
      this.weights = new ExList<number>(() => 0);
    } else {
      this.blendInfo = new ExList<BlendInfo>(() => null);
    }
  }

  clear() {
    this.asset = null;
  }

  reset(stateAsset: AnimatorState): RuntimeAnimatorState {
    this.asset = stateAsset;
    if (!this.asset) {
      return this;
    }
    this.time = this.nextTime = 0;
    this.transTime = 0;
    this.needChange = false;
    this.interrupted = false;
    this.transitionsDirty = true;
    return this;
  }

  initForCurState() {
    this.curTrans = new RuntimeAnimatorStateTransition();
  }

  get speed(): number {
    let s = this.asset;
    return s.speed || 1;
  }

  get speedByMul(): number {
    return this.speed * this.speedMul;
  }

  get speedMul(): number {
    let s = this.asset;
    return (s.speedParameter ? this.ctr.getNumber(s.speedParameter) : 1);
  }

  get durationBySpeed(): number {
    return this.duration / this.speedByMul;
  }

  _duration: number = 0;
  get duration(): number {
    return this._duration;//this.getMotionDuration(this.asset.motion);
  }

  // private getMotionDuration(m: Motion): number {
  //   if (!m) {
  //     return 1;
  //   }
  //   if (~~m.type === 1) {
  //     this.weights.length = 0;
  //     return this.getBlendTreeDuration(m as BlendTree);
  //   } else {
  //     return this.getAnimationClipDuration(m as AnimationClip);
  //   }
  // }
  //
  // private getAnimationClipDuration(ac: AnimationClip): number {
  //   let d = this.ctr.animationSource.getClipDuration(this.layer.asset.avatarMask, ac.clip);
  //   return d === undefined ? 1 : d;
  // }

  // private getBlendTreeDuration(bt: BlendTree): number {
  //   let wts = this.weights;
  //   let start = wts.length;
  //   // this.calcWeights(bt);
  //   let duration = 0;
  //   for (let i = bt.children.length; --i >= 0;) {
  //     duration += this.getMotionDuration(bt.children[i].motion) * bt.children[i].timeScale * wts[start + i];
  //   }
  //   return duration;
  // }


  private getChildThreshold(bt: BlendTree, idx: number) {
    return bt.children[idx].threshold || 0
  }

  private samplePoint: Vec2 = { x: 0, y: 0 };

  private fillSamplePoint(bt: BlendTree) {
    this.samplePoint.x = this.ctr.getNumber(bt.blendParameter);
    this.samplePoint.y = this.ctr.getNumber(bt.blendParameterY);
  }

  private calcWeights() {
    this.weights.reset();
    this.blendInfo.reset();
    if (!this.asset.motion) {
      return;
    }
    if (this.asset.motion.type === 1) {
      this.calcBlendTreeWeights(this.asset.motion as BlendTree, 1);
    } else {
      this.calcAnimationClipWeights(this.asset.motion as AnimationClip, 1, 1);
    }
    this._duration = 0;
    this.blendInfo.forEach((info, i) => {
      let d = this.ctr.animationSource.getClipDuration(info.clip);
      info.duration = d === undefined ? 1 : d;
      this._duration += info.duration * info.timeScale * info.weight;
      return true;
    });
  }

  private calcAnimationClipWeights(ac: AnimationClip, baseWeight: number, timeScale: number) {
    let info = this.blendInfo[this.blendInfo.length++];
    info.weight = baseWeight;
    info.clip = ac.clip;
    info.timeScale = timeScale;
  }

  private calcBlendTreeWeights(bt: BlendTree, baseWeight: number) {
    if (bt.children.length == 0) {
      return;
    }
    let wts = this.weights;
    let offset = wts.length;
    let len = bt.children.length;
    wts.length += len;
    if (len == 1) {
      wts[offset] = 1;
      return;
    }
    for (let i = len; --i >= 0;) {
      wts[offset + i] = 0;
    }

    if (baseWeight > 0) {
      switch (bt.blendType) {
        case BlendTreeType.Simple1D: {
          let param = this.ctr.getNumber(bt.blendParameter);
          if (param <= this.getChildThreshold(bt, 0)) {
            wts[offset] = 1;
            break;
          } else if (param >= this.getChildThreshold(bt, bt.children.length - 1)) {
            wts[offset + bt.children.length - 1] = 1;
            break;
          } else {
            let i = 0;
            let t0 = this.getChildThreshold(bt, 0);
            while (++i < bt.children.length) {
              let t = this.getChildThreshold(bt, i);
              if (param < t) {
                wts[offset + i - 1] = (t - param) / (t - t0);
                wts[offset + i] = 1 - wts[offset + i - 1];
                break;
              }
              t0 = t;
            }
          }
          break;
        }
        case BlendTreeType.Direct: {
          let totalWeight = 0;
          for (let i = bt.children.length; --i >= 0;) {
            let w = this.ctr.getNumber(bt.children[i].directBlendParameter);
            wts[offset + i] = w;
            totalWeight += w;
          }
          for (let i = bt.children.length; --i >= 0;) {
            wts[offset + i] /= totalWeight;
          }
          break;
        }
        case BlendTreeType.SimpleDirectional2D: {
          this.fillSamplePoint(bt);
          sampleWeightsDirectional(<any>this.samplePoint, bt, wts, offset);
          break;
        }
        case BlendTreeType.FreeformDirectional2D: {
          this.fillSamplePoint(bt);
          sampleWeightsPolar(<any>this.samplePoint, bt, wts, offset);
          break;
        }
        case BlendTreeType.FreeformCartesian2D: {
          this.fillSamplePoint(bt);
          sampleWeightsCartesian(<any>this.samplePoint, bt, wts, offset);
          break;
        }
      }
    }

    bt.children.forEach((c, i) => {
      if (c.motion.type === 1) {
        this.calcBlendTreeWeights((c.motion as BlendTree), wts[i + offset] * baseWeight);
      } else {
        this.calcAnimationClipWeights((c.motion as AnimationClip), wts[i + offset] * baseWeight, c.timeScale);
      }
    });
  }

  private addTrans(state: RuntimeAnimatorState) {
    if (!state.isValid) {
      return;
    }
    let ts = state.asset.transitions;
    let len = this.transitions.length;
    this.transitions.length += ts.length;
    ts.forEach((t, i) => this.transitions[i + len].reset(state, t));
  }

  private addAnyTrans(state: RuntimeAnimatorState) {
    if (!state.isValid) {
      return;
    }
    let ts = this.layer.asset.stateMachine.anyStateTransitions;
    let len = this.transitions.length;
    this.transitions.length += ts.length;
    ts.forEach((t, i) => this.transitions[i + len].reset(state, t));
  }

  private fillTrans() {
    (this.transitions || (this.transitions = new ExList<RuntimeAnimatorStateTransition>(() => new RuntimeAnimatorStateTransition()))).reset();
    this.addAnyTrans(this.midState);
    if (!this.curTrans.isValid) {
      this.addTrans(this.midState);
      return;
    }
    switch (this.curTrans.asset.interruptionSource) {
      default: {
        return;
      }
      case TransitionInterruptionSource.Source: {
        this.addTrans(this.midState);
        return;
      }
      case TransitionInterruptionSource.Destination: {
        this.addTrans(this.nextState);
        return;
      }
      case TransitionInterruptionSource.SourceThenDestination: {
        this.addTrans(this.midState);
        this.addTrans(this.nextState);
        return;
      }
      case TransitionInterruptionSource.DestinationThenSource: {
        this.addTrans(this.nextState);
        this.addTrans(this.midState);
        return;
      }
    }
  }

  private calcNextTime(dt: number) {
    this.nextTime = this.time + (this.duration ? dt * this.speedByMul / this.duration : 0);
  }

  // 根据变化获取下一个状态
  private findNextState(preState: AnimatorState, trans: AnimatorStateTransition): AnimatorState {
    if (trans.isExit) {
      let nextSM = preState.stateMachine.parent ? preState.stateMachine.parent : this.layer.asset.stateMachine;
      return this.layer.getFirstState(nextSM);
    } else if (trans.destinationState) {
      return trans.destinationState;
    } else if (trans.destinationStateMachine) {
      return this.layer.getFirstState(trans.destinationStateMachine);
    }
    return null;
  }

  private checkTrans(dt: number): number {
    let midState = this.midState;
    let nextState = this.nextState;
    let useTime = dt;

    midState.calcNextTime(useTime);
    let newTrans: RuntimeAnimatorStateTransition;
    let newNextState: AnimatorState;
    if (!this.curTrans.isValid || this.curTrans.interruptionEnabled) { // 当前没有变换或者可被打断,检查新的变换是否有效
      if (this.transitionsDirty) {
        this.transitionsDirty = false;
        this.fillTrans();
      }
      for (let i = 0, len = this.transitions.length; i < len; i++) {
        let tr: RuntimeAnimatorStateTransition = this.transitions[i];
        if (tr.asset.orderedInterruption && tr == this.curTrans) { // 跳过当前变换
          break;
        }
        if (!tr.asset.canTransitionToSelf) { // 如果不能变换到自身，需要提前查询下一个状态
          newNextState = this.findNextState(this.curTrans.isValid ? this.curTrans.state.asset : midState.asset, tr.asset);
          if (newNextState && midState.asset === newNextState) {
            newNextState = undefined;
            continue;
          }
        } else {
          newNextState = undefined;
        }
        let useTime2 = tr.update(useTime);
        if (tr.hit) {
          newTrans = tr;
          tr.resetTrigger();
          useTime = useTime2;
          break;
        }
      }
    }

    if (this.transChanged = newTrans && newTrans != this.curTrans) { // 变换变了
      let interrupted = this.curTrans.isValid;
      this.curTrans.reset(newTrans.state, newTrans.asset);
      if (interrupted) {
        midState.reset(this.curTrans.state.asset);
        if (nextState.isValid) {
          midState.time = nextState.time;
        }
        midState.interrupted = interrupted;
      }
      midState.transTime = 0;
      if (newNextState === undefined) { // 如果下一个状态没有提前查询
        newNextState = this.findNextState(midState.asset, this.curTrans.asset);
      }
      nextState.reset(newNextState);
      if (nextState.isValid) {
        nextState.time = this.curTrans.asset.offset || 0;
      }
      log("开始变换", midState.asset.name, nextState.asset.name);
      this.transitionsDirty = this.curTrans.interruptionEnabled;
    }
    return useTime;
  }

  private updateTime(dt: number) {
    let midState = this.midState;
    if (!midState.interrupted) {
      midState.time += dt * midState.speedByMul / midState.duration;
    }
    if (midState.asset == this.asset) {
      this.time = midState.time;
      this._duration = midState.duration;
    }
    this.blendInfo.reset();
    this.blendInfo.length += midState.blendInfo.length;
    midState.blendInfo.forEach((info, i) => {
      info.time = midState.time;
      this.blendInfo[i] = info;
      return true;
    });
  }

  updateRun(dt: number): number {
    let midState = this.midState;
    midState.calcWeights();
    let useTime = this.checkTrans(dt);
    this.updateTime(useTime);
    return useTime;
  }

  updateTrans(dt: number): number {
    let midState = this.midState;
    let nextState = this.nextState;
    midState.calcWeights();
    let useTime = dt;
    let duration = this.curTrans.duration;
    if (midState.transTime + dt >= duration) {
      useTime = midState.transTime + dt - duration;
    }
    if (nextState.isValid) {
      nextState.calcWeights();
      nextState.calcNextTime(useTime);
    }

    useTime = this.checkTrans(useTime);

    this.updateTime(useTime);

    if (!this.transChanged) {
      let duration = this.curTrans.duration;
      midState.transTime += this.curTrans.hasFixedDuration ? useTime : midState.duration ? useTime * this.midState.speedByMul / midState.duration : 0;
      if (midState.transTime >= duration) {//切换
        this.needChange = true;
      }
      if (nextState.isValid) {
        nextState.time += nextState.duration ? useTime * nextState.speedByMul / nextState.duration : 0;
        let p = 1 - clamp01(duration ? midState.transTime / duration : 0);
        this.blendInfo.forEach(v => {
          v.weight *= p;
          return true;
        });
        let idx = this.blendInfo.length;
        this.blendInfo.length += nextState.blendInfo.length;
        p = 1 - p;
        nextState.blendInfo.forEach((info, i) => {
          info.time = nextState.time;
          info.weight *= p;
          this.blendInfo[i + idx] = info;
          return true;
        });
      }
    }
    return useTime;
  }

  // update(dt: number): number {
  //   let midState = this.midState;
  //   let nextState = this.nextState;
  //   let useTime = dt;
  //   if (this.curTrans.isValid) {
  //     let duration = this.curTrans.transDuration;
  //     if (midState.transTime + dt >= duration) {
  //       useTime = midState.transTime + dt - duration;
  //     }
  //     if (nextState.isValid) {
  //       nextState.calcNextTime(useTime);
  //     }
  //   }
  //
  //   midState.calcNextTime(useTime);
  //   let newTrans: RuntimeAnimatorStateTransition = null;
  //   if (!this.curTrans.isValid || this.curTrans.interruptionEnabled) { // 当前没有变换或者，可被打断
  //     if (this.transitionsDirty) {
  //       this.transitionsDirty = false;
  //       this.fillTrans();
  //     }
  //     for (let i = 0, len = this.transitions.length; i < len; i++) {
  //       let tr = this.transitions[i];
  //       if (tr.transitionAsset.orderedInterruption && tr == this.curTrans) {
  //         break;
  //       }
  //       let useTime2 = tr.update(useTime);
  //       if (tr.hit) {
  //         newTrans = tr;
  //         tr.resetTrigger();
  //         useTime = useTime2;
  //         break;
  //       }
  //     }
  //   }
  //
  //   let transChanged = newTrans && newTrans != this.curTrans;
  //   if (transChanged) { // 变换变了
  //     if (this.curTrans.isValid) {
  //       midState.interrupted = true;
  //     }
  //     this.curTrans.reset(newTrans.state, newTrans.transitionAsset);
  //     midState.reset(this.curTrans.state.asset);
  //     midState.transTime = 0;
  //     let t = this.curTrans.transitionAsset;
  //     if (t.isExit) {
  //       let nextSM = midState.asset.stateMachine.parent ? midState.asset.stateMachine.parent : this.layer.asset.stateMachine;
  //       nextState.reset(this.layer.getFirstState(nextSM));
  //     } else if (t.destinationState) {
  //       nextState.reset(t.destinationState);
  //     } else if (t.destinationStateMachine) {
  //       nextState.reset(this.layer.getFirstState(t.destinationStateMachine));
  //     }
  //     if (nextState.isValid) {
  //       nextState.time = this.curTrans.transitionAsset.offset || 0;
  //     }
  //     log("开始变换", midState.asset.name, nextState.asset.name);
  //     this.transitionsDirty = this.curTrans.interruptionEnabled;
  //   }
  //
  //   if (!transChanged && this.curTrans.isValid) {
  //     let duration = this.curTrans.transDuration;
  //     midState.transTime += useTime;
  //     if (midState.transTime >= duration) {//切换
  //       this.needChange = true;
  //     }
  //     if (nextState.isValid) {
  //       nextState.time += useTime * nextState.speed / nextState.duration;
  //     }
  //   }
  //
  //   if (!midState.interrupted) {
  //     midState.time += useTime * midState.speed / midState.duration;
  //   }
  //
  //   if (midState.asset == this.asset) {
  //     this.time = midState.time;
  //   }
  //
  //   return useTime;
  // }
}

class RuntimeAnimatorStateTransition {
  state: RuntimeAnimatorState;
  asset: AnimatorStateTransition;
  hit: boolean;

  private get layer() {
    return this.state.layer;
  }

  private get ctr() {
    return this.layer.ctr;
  }

  constructor() {
  }

  get isValid(): boolean {
    return !!this.asset;
  }

  get interruptionEnabled(): boolean {
    return ~~this.asset.interruptionSource != TransitionInterruptionSource.None;
  }

  clear() {
    this.asset = null;
  }

  reset(state: RuntimeAnimatorState, asset: AnimatorStateTransition): RuntimeAnimatorStateTransition {
    this.state = state;
    this.asset = asset;
    this.hit = false;
    return this;
  }

  resetTrigger() {
    this.asset.conditions.forEach(c => {
      if (this.ctr.getParameterAsset(c.parameter).type == AnimatorControllerParameterType.Trigger) {
        this.ctr.setParameter(c.parameter, false);
      }
    });
  }

  checkConditions(): boolean {
    return this.asset.conditions.every(cond => {
      switch (cond.mode) {
        case AnimatorConditionMode.Greater:
          return this.ctr.getNumber(cond.parameter) > (cond.threshold || 0);
        case AnimatorConditionMode.Equals:
          return this.ctr.getNumber(cond.parameter) === (cond.threshold || 0);
        case AnimatorConditionMode.If:
          return !!this.ctr.getBool(cond.parameter);
        case AnimatorConditionMode.IfNot:
          return !this.ctr.getBool(cond.parameter);
        case AnimatorConditionMode.Less:
          return this.ctr.getNumber(cond.parameter) < (cond.threshold || 0);
        case AnimatorConditionMode.NotEqual:
          return this.ctr.getNumber(cond.parameter) !== (cond.threshold || 0);
      }
    });
    return true;
  }

  get duration(): number {
    return this.asset.duration || 0;
    // if (this.asset.hasFixedDuration) {
    //   return this.asset.duration || 0;
    // } else {
    //   return this.state.durationBySpeed * (this.asset.duration || 0);
    // }
  }

  get hasFixedDuration(): boolean {
    return !!this.asset.hasFixedDuration;
  }

  // get fixedDuration(): number {
  //   if (this.asset.hasFixedDuration) {
  //     return this.asset.duration || 0;
  //   } else {
  //     return this.state.durationBySpeed * (this.asset.duration || 0);
  //   }
  // }

  update(dt: number): number {
    this.hit = false;
    let useTime = dt;
    if (!this.asset.hasExitTime && this.asset.conditions.length == 0) {
      return useTime;
    }
    let hit = this.checkConditions();
    if (!hit) {
      return useTime;
    }
    if (!this.asset.hasExitTime) {
      this.hit = true;
      return useTime;
    }

    if (this.asset.hasExitTime) {
      let eTime = this.asset.exitTime || 0;
      if (eTime <= 1) {
        eTime += ~~this.state.time;
      }
      if (this.state.time >= eTime) {
        eTime++;
      }
      if (this.state.time < eTime && this.state.nextTime >= eTime) {
        this.hit = true;
        return useTime;
      }
    }
    return useTime;
  }
}