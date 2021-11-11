import { Animation, AnimationClip, AnimationManager, AnimationState, Asset, Component, director, error, JsonAsset, Socket, _decorator } from "cc";
import { AnimatorOverrideController } from "./AnimatorOverrideController";
import { BlendInfo, IAnimationSource, LayerBlendInfo, RuntimeAnimatorController } from "./RuntimeAnimatorController";
import { StateBehaviour, StateCallback } from "./StateBehaviour";
import { StateMachineBehaviour } from "./StateMachineBehaviour";

const { ccclass, property, executionOrder } = _decorator;

@ccclass("Animator")
@executionOrder(-100)
export class Animator extends Component implements IAnimationSource {
  @property(Animation)
  animation: Animation = null;
  @property(Asset)
  bonAsset: Asset = null;
  @property(JsonAsset)
  jsonAsset: JsonAsset = null;
  @property(AnimatorOverrideController)
  overrideController: AnimatorOverrideController = null;
  runtimeController: RuntimeAnimatorController;

  private stateBehaviours: { [idx: string]: StateBehaviour[] } = {};
  private stateMachineBehaviours: { [idx: string]: StateMachineBehaviour[] } = {};

  private nameToState: { [idx: string]: AnimationState } = {};
  private useBake: boolean;
  private runner: IAnimatorRunner;

  start() {
    window["ani"] = this;
    let anim = this.animation || (this.animation = this.getComponent(Animation));
    if (!anim) {
      error("AnimationComponent not found");
      this.enabled = false;
      return;
    }
    anim.defaultClip = null;
    this.useBake = !!anim["useBakedAnimation"];
    if (this.useBake) {
      this.runner = new AnimatorRunnerBaked(this);
    } else {
      anim.enabled = false;
      this.runner = new AnimatorRunnerUnbaked(this);
    }
    if (this.bonAsset && window["bon"]) {
      if (!(<any>this.bonAsset).json) {
        (<any>this.bonAsset).json = window["bon"].decode(new Uint8Array(this.bonAsset.bytes()));
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
        let clip = anim.clips.find(p => p.name == overrids[k]);
        this.overrideController.addClip(k, clip);
      }
    }
    this.getComponents(StateBehaviour).forEach(p => this.addStateBehavior(p));
    this.getComponents(StateMachineBehaviour).forEach(p => this.addStateMachineBehavior(p));

    if (!this.useBake) {
      anim["_sockets"].forEach((p: Socket) => {
        let follow = anim.node.getChildByPath(p.path);
        if (!follow) {
          return;
        }
        for (let i = p.target.children.length; --i >= 0;) {
          p.target.children[i].setParent(follow, false);
        }
        p.target.destroy();
      });
      anim["_sockets"] = [];
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
    if (fast) {
      return fast;
    }
    let clip = this.overrideController && this.overrideController.getClip(name);
    if (!clip) {
      clip = this.animation.clips.find(p => p.name == name);
    }
    let state = this.runner.createAnimationState(clip, name2, layer);
    this.nameToState[name2] = state;
    return state;
  }

  public getClipDuration(name: string): number {
    let state = this.getAnimationState(name);
    return state && state.duration || 0;
  }

  update(dt: number) {
    this.runtimeController.update(dt);
    let blendInfo = this.runtimeController.blendInfo;
    this.runner.update(blendInfo);
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

interface IAnimatorRunner {
  createAnimationState(clip: AnimationClip, name: string, layer: number): AnimationState;
  update(lbis: LayerBlendInfo[]): void;
}

class AnimatorRunnerBaked implements IAnimatorRunner {
  animator: Animator;
  private prePlaying: Set<AnimationState> = new Set<AnimationState>();
  private nowPlaying: Set<AnimationState> = new Set<AnimationState>();
  constructor(animator: Animator) {
    this.animator = animator;
  }

  createAnimationState(clip: AnimationClip, name: string, layer: number): AnimationState {
    return this.animator.animation.createState(clip, name);
  }

  update(lbis: LayerBlendInfo[]): void {
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

    this.nowPlaying.clear();

    let state = this.animator.getAnimationState(info.clip);
    if (!state) {
      return;
    }
    if (!this.prePlaying.has(state)) {
      state.play();
      state.pause();
    }
    state.weight = 1;
    this.nowPlaying.add(state);
    state.update(info.time * info.duration - state.time);

    this.prePlaying.forEach(state => {
      if (!this.nowPlaying.has(state)) {
        state.stop();
        state.weight = 0;
        // delete (state["_maskInfo"]);
      }
    });

    let tmp = this.prePlaying;
    this.prePlaying = this.nowPlaying;
    this.nowPlaying = tmp;
  }
}

let _BlendStateBufferCtor: any;
function BlendStateBuffer(): any {
  if (_BlendStateBufferCtor) {
    return _BlendStateBufferCtor();
  }
  _BlendStateBufferCtor = (director.getSystem(AnimationManager.ID) as AnimationManager).blendState.constructor;
  return _BlendStateBufferCtor;
}


class AnimatorRunnerUnbaked implements IAnimatorRunner {
  animator: Animator;
  blendStateBuffer: any;
  constructor(animator: Animator) {
    this.animator = animator;
    this.blendStateBuffer = new (BlendStateBuffer())();
  }

  createAnimationState(clip: AnimationClip, name: string, layer: number): AnimationState {
    let avatarMask = this.animator.runtimeController.layers[layer].asset.avatarMask;
    if (avatarMask) {
      let clip2 = Object.assign(new (clip.constructor as any)(), clip);
      let exot = clip2._exoticAnimation = Object.assign(new (clip2._exoticAnimation.constructor)(), clip2._exoticAnimation);
      exot._nodeAnimations = exot._nodeAnimations.slice();
      for (let i = exot._nodeAnimations.length; --i >= 0;) {
        let _path: string = exot._nodeAnimations[i].path;
        let found = false;
        for (let j = avatarMask.length; --j >= 0;) {
          if (avatarMask[j] === "") {
            continue;
          }
          let idx = _path.lastIndexOf(avatarMask[j]);
          if (idx >= 0 && idx + avatarMask[j].length == _path.length) {
            found = true;
            break;
          }
        }
        if (!found) {
          exot._nodeAnimations.splice(i, 1);
        }
      }
      clip = clip2;
    }
    let state = new AnimationState(clip, name);
    state.initialize(this.animator.animation.node, this.blendStateBuffer);
    state.weight = 0;
    return state;
  }

  update(lbis: LayerBlendInfo[]): void {
    lbis.forEach(lbi => {
      lbi.infos.forEach(info => {
        let state = this.animator.getAnimationState(info.clip, lbi.idx);
        if (!state) {
          return;
        }
        state.time = info.time * info.duration;
        state.weight = info.weight;
        // state["_maskInfo"] = lbi.maskInfo;
        state.sample();
        state.weight = 0;
      });
    });
    this.blendStateBuffer.apply();
  }
}