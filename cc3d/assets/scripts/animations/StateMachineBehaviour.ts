import {_decorator, Component} from "cc";
import {Animator} from "./Animator";

const {ccclass, property} = _decorator;

@ccclass("StateMachineBehaviour")
export class StateMachineBehaviour extends Component {
  @property
  public fullName: string = "";

  onStateMachineEnter(animator: Animator, stateMachinePathHash: number, layer: number) {
  }

  onStateMachineExit(animator: Animator, stateMachinePathHash: number, layer: number) {
  }
}

export type StateMachineCallback = (animator: Animator, stateMachinePathHash: number, layer: number) => void;
