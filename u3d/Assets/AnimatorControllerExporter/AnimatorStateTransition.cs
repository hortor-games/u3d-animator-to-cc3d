#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace Exporter {
    public class AnimatorStateTransition {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorStateMachine stateMachine;
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorState parentSate;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorTransitionBase asset;

        public float duration;
        public float offset;
        public int interruptionSource;
        public bool orderedInterruption;
        public float exitTime;
        public bool hasExitTime;
        public bool hasFixedDuration;
        public bool canTransitionToSelf;
        public bool solo;
        public bool mute;
        public bool isExit;
        public int destinationStateMachine;
        public int destinationState;
        public List<AnimatorCondition> conditions = new List<AnimatorCondition>();
        //public string name;


        public AnimatorStateTransition() {
        }

        private AnimatorStateTransition(AnimatorStateMachine sm, AnimatorState parentSate, UnityEditor.Animations.AnimatorTransitionBase t) {
            this.stateMachine = sm;
            this.parentSate = parentSate;
            this.asset = t;

            this.solo = t.solo;
            this.mute = t.mute;
            this.isExit = t.isExit;

            this.destinationState = t.destinationState == null ? 0 : sm.layer.stateMap[t.destinationState];
            this.destinationStateMachine = t.destinationStateMachine == null ? 0 : sm.layer.stateMachineMap[t.destinationStateMachine];
            //if (t.destinationState != null && !sm.asset.stateMachines.Any(p => p.stateMachine == t.destinationState)) {
            //    this.destinationStateMachine = sm.layer.stateMachineMap[sm.layer.stateToMachineMap[t.destinationState]];
            //}
            foreach (var c in t.conditions) {
                this.conditions.Add(new AnimatorCondition(this, c));
            }
        }

        public AnimatorStateTransition(AnimatorStateMachine sm, AnimatorState parentSate, UnityEditor.Animations.AnimatorTransition t)
            : this(sm, parentSate, (UnityEditor.Animations.AnimatorTransitionBase)t) {
        }

        public AnimatorStateTransition(AnimatorStateMachine sm, AnimatorState parentSate, UnityEditor.Animations.AnimatorStateTransition t)
            : this(sm, parentSate, (UnityEditor.Animations.AnimatorTransitionBase)t) {
            this.duration = t.duration;
            this.offset = t.offset;
            this.interruptionSource = (int)t.interruptionSource;
            this.orderedInterruption = t.orderedInterruption;
            this.exitTime = t.exitTime;
            this.hasExitTime = t.hasExitTime;
            this.hasFixedDuration = t.hasFixedDuration;
            this.canTransitionToSelf = t.canTransitionToSelf;
        }


    }

}
#endif