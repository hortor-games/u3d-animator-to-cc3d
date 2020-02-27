import {_decorator, AnimationClip, Component} from "cc";
import {AnimationClipPair} from "./AnimatorClipPair";

const {ccclass, property} = _decorator;

@ccclass("AnimatorOverrideController")
export class AnimatorOverrideController extends Component {
  @property([AnimationClipPair])
  private _clips: AnimationClipPair[] = [];
  @property({type: [AnimationClipPair]})
  get clips() {
    return this._clips;
  }

  set clips(v: AnimationClipPair[]) {
    this._clips = v;
    this._clipMap.clear();
  }

  private _clipMap: Map<string, AnimationClip> = new Map<string, AnimationClip>();
  private get clipMap(): Map<string, AnimationClip> {
    if (this._clipMap.size == 0 && this.clips.length > 0) {
      this.clips.forEach(p => this._clipMap.set(p.name, p.clip));
    }
    return this._clipMap;
  }

  getClip(name: string): AnimationClip {
    return this.clipMap.get(name);
  }
}

