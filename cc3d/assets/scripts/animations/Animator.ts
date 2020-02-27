import {_decorator, AnimationComponent, AnimationState, Asset, Component, JsonAsset} from "cc";
import {BlendInfo, IAnimationSource, RuntimeAnimatorController} from "./RuntimeAnimatorController";
import {StateBehaviour, StateCallback} from "./StateBehaviour";
import {StateMachineBehaviour} from "./StateMachineBehaviour";
import {AnimatorOverrideController} from "./AnimatorOverrideController";

const {ccclass, property, executionOrder} = _decorator;

@ccclass("Animator")
@executionOrder(-100)
export class Animator extends Component implements IAnimationSource {
  @property(AnimationComponent)
  animation: AnimationComponent = null;
  @property(Asset)
  bonAsset: Asset = null;
  @property(JsonAsset)
  jsonAsset: JsonAsset = null;
  @property
  clipNamePrefix: string = "";
  @property(AnimatorOverrideController)
  overrideController: AnimatorOverrideController = null;
  runtimeController: RuntimeAnimatorController;

  private prePlaying: Set<AnimationState> = new Set<AnimationState>();
  private nowPlaying: Set<AnimationState> = new Set<AnimationState>();
  private stateBehaviours: { [idx: string]: StateBehaviour[] } = {};
  private stateMachineBehaviours: { [idx: string]: StateMachineBehaviour[] } = {};

  start() {
    window["ani"] = this;
    if (this.bonAsset && window["bon"]) {
      if (!(<any>this.bonAsset).json) {
        (<any>this.bonAsset).json = bon.decode(new Uint8Array(this.bonAsset.bytes()));
      }
      this.runtimeController = new RuntimeAnimatorController(this, (<any>this.bonAsset).json);
    } else if (this.jsonAsset) {
      this.runtimeController = new RuntimeAnimatorController(this, this.jsonAsset.json);
    }
    this.getComponents(StateBehaviour).forEach(p => this.addStateBehavior(p));
    this.getComponents(StateMachineBehaviour).forEach(p => this.addStateMachineBehavior(p));
  }

  getNumber(name: string): number {
    return this.runtimeController.getNumber(name);
  }

  getBool(name: string): boolean {
    return this.runtimeController.getBool(name);
  }

  setParameter(name: string, value: number | boolean) {
    this.runtimeController.setParameter(name, value);
  }

  crossFade(stateName: string, normalizedTransitionDuration: number, normalizedTimeOffset: number = 0, normalizedTransitionTime: number = 0) {
    this.runtimeController.crossFade(stateName, false, normalizedTransitionDuration, normalizedTimeOffset, normalizedTransitionTime);
  }

  crossFadeInFixedTime(stateName: string, fixedTransitionDuration: number, normalizedTimeOffset: number = 0, normalizedTransitionTime: number = 0) {
    this.runtimeController.crossFade(stateName, true, fixedTransitionDuration, normalizedTimeOffset, normalizedTransitionTime);
  }

  private static readonly NAME = ["", "*"];
  private static stateInfo: AnimatorStateInfo = <any>{};

  private addStateBehavior(sb: StateBehaviour) {
    (this.stateBehaviours[sb.fullName] || (this.stateBehaviours[sb.fullName] = [])).push(sb);
    this.runtimeController.onStateEvent || (this.runtimeController.onStateEvent = (e, s) => {
      if (!this.isValid) {
        return;
      }
      Animator.NAME[0] = s.asset.fullPath;
      Animator.NAME.forEach(n => {
        let ss = this.stateBehaviours[n];
        if (!ss) {
          return;
        }
        let info = Animator.stateInfo;
        info.name = s.asset.name;
        info.fullPath = s.asset.fullPath;
        info.fullPathHash = s.asset.id;
        info.length = s.duration;
        info.normalizedTime = s.time;
        info.speed = s.speed;
        info.speedMultiplier = s.speedMul;
        ss.forEach(p => p[e] && (<StateCallback>p[e])(this, info, s.layer.asset.idx));
      });
    });
  }

  private addStateMachineBehavior(smb: StateMachineBehaviour) {
    (this.stateMachineBehaviours[smb.fullName] || (this.stateMachineBehaviours[smb.fullName] = [])).push(smb);
    this.runtimeController.onStateMachineEvent || (this.runtimeController.onStateMachineEvent = (e, s) => {
      if (!this.isValid) {
        return;
      }
      Animator.NAME[0] = s.fullPath;
      Animator.NAME.forEach(n => {
        let ss = this.stateMachineBehaviours[n];
        ss && ss.forEach(p => p[e] && p[e](this, s.id, s.layer.idx));
      });
    });
  }

  public getAnimationState(name: string): AnimationState {
    name = this.clipNamePrefix + name;
    let overrideClip = this.overrideController && this.overrideController.getClip(name);
    if (overrideClip) {
      name = overrideClip.name;
    }
    let ani = this.animation;
    let state = ani && ani.getState(name);
    if (state) {
      return state;
    }
    return null;
  }

  public getClipDuration(name: string): number {
    let state = this.getAnimationState(name);
    return state && state.duration || 0;
  }

  update(dt: number) {
    if (!this.runtimeController) {
      return;
    }
    this.runtimeController.update(dt);
    this.nowPlaying.clear();
    let blendInfo = this.runtimeController.blendInfo;
    if (blendInfo.length == 0) {
      return;
    }
    let info: BlendInfo;
    if (blendInfo.length === 1) {
      info = blendInfo[0];
    } else {
      let max = Number.NEGATIVE_INFINITY;
      blendInfo.forEach(p => {
        if (p.weight > max) {
          max = p.weight;
          info = p;
        }
        return true;
      });
    }

    let state = this.getAnimationState(info.clip);
    if (!state) {
      return;
    }
    if (!this.prePlaying.has(state)) {
      state.play();
      state.pause();
    }
    this.nowPlaying.add(state);
    state.update(info.time * info.duration - state.time);

    this.prePlaying.forEach(clip => {
      if (!this.nowPlaying.has(clip)) {
        clip.stop();
      }
    });
    let tmp = this.prePlaying;
    this.prePlaying = this.nowPlaying;
    this.nowPlaying = tmp;
  }
}


export type AnimatorStateInfo = {
  name: string;
  fullPath: string;
  fullPathHash: number;
  length: number;
  normalizedTime: number;
  speed: number;
  speedMultiplier: number;
}