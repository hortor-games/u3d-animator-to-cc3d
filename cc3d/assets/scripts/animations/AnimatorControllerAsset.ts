export type AnimatorController = {
  readonly parameters: AnimatorControllerParameter[];
  readonly layers: AnimatorControllerLayer[];
  processed: boolean;
  parametersMap: { [idx: string]: AnimatorControllerParameter };
  stateMachinesHashMap: { [idx: number]: AnimatorStateMachine };
  statesHashMap: { [idx: number]: AnimatorState };
  stateMachinesNameMap: { [idx: string]: AnimatorStateMachine };
  statesNameMap: { [idx: string]: AnimatorState };
}

export enum AnimatorControllerParameterType {
  /**
   * number type parameter.
   */
  Number = 1,
  /**
   * Boolean type parameter.
   */
  Bool = 4,
  /**
   * Trigger type parameter.
   */
  Trigger = 9
}

export type AnimatorControllerParameter = {
  readonly name: string;
  readonly type: AnimatorControllerParameterType;
  readonly defaultValue: number | boolean;
}

export enum AnimatorLayerBlendingMode {
  /**
   * Animations overrides to the previous layers.
   */
  Override = 0,
  /**
   * Animations are added to the previous layers.
   */
  Additive = 1
}

export type AnimatorControllerLayer = {
  name: string;
  avatarMask: string;
  stateMachine: AnimatorStateMachine;// | number;
  blendingMode: AnimatorLayerBlendingMode;// = AnimatorLayerBlendingMode.Override;
  syncedLayerIndex: number;// = 0;
  defaultWeight: number;// = 0;
  syncedLayerAffectsTiming: boolean;// = false;
  stateMachines: AnimatorStateMachine[];
  states: AnimatorState[];
  idx: number;
}

export type AnimatorStateMachine = {
  readonly id: number;
  readonly name: string;
  readonly states: AnimatorState[];// | number[];// = [];
  readonly stateMachines: AnimatorStateMachine[];// | number[];// = [];
  defaultState: AnimatorState;// | number;
  readonly anyStateTransitions: AnimatorStateTransition[];// = [];
  readonly entryTransitions: AnimatorStateTransition[];// = [];
  // statesMap: { [idx: string]: AnimatorState };
  parent: AnimatorStateMachine;
  layer: AnimatorControllerLayer;
  // stateMachinesMap: { [idx: string]: AnimatorStateMachine };
  fullPath: string;
}

export type AnimatorState = {
  readonly id: number;
  readonly name: string;
  readonly motion: AnimationClip | BlendTree;
  readonly speed: number;// = 1;
  // readonly cycleOffset: number;// = 0;
  readonly writeDefaultValues: boolean;// = false;
  readonly speedParameter: string;// = 0;
  // readonly cycleOffsetParameter: string;// = 0;
  // readonly mirrorParameter: string;// = 0;
  // readonly timeParameter: string;// = 0;
  readonly transitions: AnimatorStateTransition[];// = [];
  // readonly mirror: boolean;// = false;
  stateMachine: AnimatorStateMachine;
  fullPath: string;
}

export enum TransitionInterruptionSource {
  /**
   * The Transition cannot be interrupted. Formely know as Atomic.
   */
  None = 0,
  /**
   * The Transition can be interrupted by transitions in the source AnimatorState.
   */
  Source = 1,
  /**
   * The Transition can be interrupted by transitions in the destination AnimatorState.
   */
  Destination = 2,
  /**
   * The Transition can be interrupted by transitions in the source or the destination AnimatorState.
   */
  SourceThenDestination = 3,
  /**
   * The Transition can be interrupted by transitions in the source or the destination AnimatorState.
   */
  DestinationThenSource = 4
}

export type AnimatorStateTransition = {
  duration: number;// = 0;
  offset: number;// = 0;
  interruptionSource: TransitionInterruptionSource;// = TransitionInterruptionSource.None;
  readonly orderedInterruption: boolean;// = false;
  readonly exitTime: number;// = 0;
  hasExitTime: boolean;// = false;
  hasFixedDuration: boolean;// = false;
  readonly canTransitionToSelf: boolean;// = false;
  readonly solo: boolean;// = false;
  readonly mute: boolean;// = false;
  isExit: boolean;// = false;
  destinationStateMachine: AnimatorStateMachine;// | number;// = 0;
  destinationState: AnimatorState;// | number;// = 0;
  readonly conditions: AnimatorCondition[];// = [];
}

export enum AnimatorConditionMode {
  /**
   * The condition is true when the parameter value is true.
   */
  If = 1,
  /**
   * The condition is true when the parameter value is false.
   */
  IfNot = 2,
  /**
   * The condition is true when parameter value is greater than the threshold.
   */
  Greater = 3,
  /**
   * The condition is true when the parameter value is less than the threshold.
   */
  Less = 4,
  /**
   * The condition is true when parameter value is equal to the threshold.
   */
  Equals = 6,
  /**
   * The condition is true when the parameter value is not equal to the threshold.
   */
  NotEqual = 7
}

export type AnimatorCondition = {
  readonly mode: AnimatorConditionMode;
  readonly parameter: string;// | string;
  readonly threshold: number;
}

export interface Motion {
  readonly type: number;
}

export interface AnimationClip extends Motion {
  readonly clip: string;
}

export enum BlendTreeType {
  /**
   * Basic blending using a single parameter.
   */
  Simple1D = 0,
  /**
   * Best used when your motions represent different directions, such as "walk forward",
   * "walk backward", "walk left", and "walk right", or "aim up", "aim down", "aim
   * left", and "aim right".
   */
  SimpleDirectional2D = 1,
  /**
   * This blend type is used when your motions represent different directions, however
   * you can have multiple motions in the same direction, for example "walk forward"
   * and "run forward".
   */
  FreeformDirectional2D = 2,
  /**
   * Best used when your motions do not represent different directions.
   */
  FreeformCartesian2D = 3,
  /**
   * Direct control of blending weight for each node.
   */
  Direct = 4
}

export interface BlendTree extends Motion {
  blendType: BlendTreeType;
  readonly blendParameter: string;
  readonly blendParameterY: string;
  readonly children: ChildMotion[];
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface ChildMotion {
  readonly threshold: number;
  readonly position: Vec2;
  readonly timeScale: number;
  readonly directBlendParameter: string;
  readonly motion: Motion;
}