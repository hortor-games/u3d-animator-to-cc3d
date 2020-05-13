import { AnimationComponent, AnimationState, Asset, Component, JsonAsset, _decorator, SkeletalAnimationComponent, SkeletalAnimationState, AnimationClip, Socket, animation, Node } from "cc";
import { AnimatorOverrideController } from "./AnimatorOverrideController";
import { BlendInfo, IAnimationSource, RuntimeAnimatorController, ExList, LayerBlendInfo } from "./RuntimeAnimatorController";
import { StateBehaviour, StateCallback } from "./StateBehaviour";
import { StateMachineBehaviour } from "./StateMachineBehaviour";
import { log, error } from "cc";

const { ccclass, property, executionOrder } = _decorator;

@ccclass("Animator")
@executionOrder(-100)
export class Animator extends Component implements IAnimationSource {
  @property(AnimationComponent)
  animation: AnimationComponent = null;
  @property(Asset)
  bonAsset: Asset = null;
  @property(JsonAsset)
  jsonAsset: JsonAsset = null;
  @property(AnimatorOverrideController)
  overrideController: AnimatorOverrideController = null;
  runtimeController: RuntimeAnimatorController;

  private prePlaying: Set<AnimationState> = new Set<AnimationState>();
  private nowPlaying: Set<AnimationState> = new Set<AnimationState>();
  private stateBehaviours: { [idx: string]: StateBehaviour[] } = {};
  private stateMachineBehaviours: { [idx: string]: StateMachineBehaviour[] } = {};

  private nameToState: { [idx: string]: AnimationState } = {};

  private useBake: boolean;


  start() {
    window["ani"] = this;
    if (!this.animation) {
      this.animation = this.getComponent(SkeletalAnimationComponent);
    }
    if (!this.animation) {
      error("SkeletalAnimationComponent not found");
      this.enabled = false;
      return;
    }
    this.useBake = this.animation["useBakedAnimation"];
    if (this.bonAsset && window["bon"]) {
      if (!(<any>this.bonAsset).json) {
        (<any>this.bonAsset).json = bon.decode(new Uint8Array(this.bonAsset.bytes()));
      }
      this.runtimeController = new RuntimeAnimatorController(this, (<any>this.bonAsset).json);
    } else if (this.jsonAsset) {
      this.runtimeController = new RuntimeAnimatorController(this, this.jsonAsset.json);
    }
    let overrids = this.runtimeController.overrids;
    if (overrids) {
      if (!this.overrideController) {
        this.overrideController = this.addComponent(AnimatorOverrideController);
      }
      for (let k in overrids) {
        let state = this.getAnimationState(overrids[k]);
        this.overrideController.addClip(k, state && state.clip);
      }
    }
    this.getComponents(StateBehaviour).forEach(p => this.addStateBehavior(p));
    this.getComponents(StateMachineBehaviour).forEach(p => this.addStateMachineBehavior(p));
    this.animation.stop();
    this.animation.defaultClip = null;
    if (!this.useBake) {
      this.animation["_sockets"].forEach((p: Socket) => {
        let follow = this.animation.node.getChildByPath(p.path);
        if (!follow) {
          return;
        }
        for (let i = p.target.children.length; --i >= 0;) {
          p.target.children[i].setParent(follow, false);
        }
        p.target.destroy();
      });
      this.animation["_sockets"] = [];
    }
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

  setTrigger(name: string) {
    this.runtimeController.setTrigger(name);
  }

  crossFade(stateName: string, normalizedTransitionDuration: number, normalizedTimeOffset: number = 0, normalizedTransitionTime: number = 0) {
    this.runtimeController.crossFade(stateName, false, normalizedTransitionDuration, normalizedTimeOffset, normalizedTransitionTime);
  }

  play(stateName: string, normalizedTime: number = 0) {
    this.runtimeController.play(stateName, normalizedTime);
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

  public getAnimationState(name: string, layer: number = 0): AnimationState {
    let name2 = layer == 0 ? name : name + "~" + layer;
    let fast = this.nameToState[name2];
    if (fast !== undefined) {
      return fast;
    }
    let ani = this.animation;
    let name3 = name2;
    let overrideClip = this.overrideController && this.overrideController.getClip(name);
    if (overrideClip) {
      name3 = "*" + name3;
    }
    let state = ani.getState(name3);
    if (!state) {
      let clip = overrideClip || ani.clips.find(p => p.name == name);
      if (clip) {
        state = ani.createState(clip, name3);
      }
    }
    if (!state) {
      state = null;
    }
    this.nameToState[name2] = state;
    return state;
  }

  public getClipDuration(name: string): number {
    let state = this.getAnimationState(name);
    return state && state.duration || 0;
  }

  update(dt: number) {
    this.runtimeController.update(dt);
    this.nowPlaying.clear();
    let blendInfo = this.runtimeController.blendInfo;
    if (this.useBake) {
      this.updateSimple(blendInfo);
    } else {
      this.updateBlend(blendInfo);
    }

    this.prePlaying.forEach(state => {
      if (!this.nowPlaying.has(state)) {
        state.stop();
        state.weight = 0;
        delete (state["_maskInfo"]);
      }
    });
    let tmp = this.prePlaying;
    this.prePlaying = this.nowPlaying;
    this.nowPlaying = tmp;
  }

  private updateSimple(lbis: LayerBlendInfo[]) {
    let info: BlendInfo;
    let max = Number.NEGATIVE_INFINITY;
    lbis.forEach(lbi => {
      lbi.infos.forEach(p => {
        let w = p.weight * lbi.weight;
        if (w >= max) {
          max = w;
          info = p;
        }
      })
    });

    let state = this.getAnimationState(info.clip);
    if (!state) {
      return;
    }
    if (!this.prePlaying.has(state)) {
      state.play();
      state.pause();
    }
    state.weight = 1;
    this.nowPlaying.add(state);
    state.update(info.time * info.duration - state.time)
  }

  private updateBlend(lbis: LayerBlendInfo[]) {
    lbis.forEach(lbi => {
      lbi.infos.forEach(info => {
        let state = this.getAnimationState(info.clip, lbi.idx);
        if (!state) {
          return;
        }
        if (!this.prePlaying.has(state)) {
          state.play();
          state.pause();
        }
        state.weight = info.weight;
        state["_maskInfo"] = lbi.maskInfo;
        this.nowPlaying.add(state);
        state.update(info.time * info.duration - state.time)
      });
    });
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