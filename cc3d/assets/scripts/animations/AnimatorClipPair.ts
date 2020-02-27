import {_decorator, AnimationClip} from "cc";

const {ccclass, property} = _decorator;

@ccclass('AnimationClipPair')
export class AnimationClipPair {
  @property
  name: string = "";
  @property(AnimationClip)
  clip: AnimationClip = null;
}


