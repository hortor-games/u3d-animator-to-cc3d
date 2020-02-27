import {_decorator, Component, log} from "cc";
import {Animator, AnimatorStateInfo} from "./Animator";

const {ccclass, property} = _decorator;

@ccclass("StateBehaviour")
export class StateBehaviour extends Component {
  @property
  public fullName: string = "";

  onStateEnter(animator: Animator, animatorStateInfo: AnimatorStateInfo, layerIndex: number) {
    log("onStateEnter", animatorStateInfo);
  }

  onStateExit(animator: Animator, animatorStateInfo: AnimatorStateInfo, layerIndex: number) {
    log("onStateExit", animatorStateInfo);
  }

  onStateUpdate(animator: Animator, animatorStateInfo: AnimatorStateInfo, layerIndex: number) {
    // log("onStateUpdate", animatorStateInfo);
  }
}

export type StateCallback = (animator: Animator, animatorStateInfo: AnimatorStateInfo, layerIndex: number) => void;
