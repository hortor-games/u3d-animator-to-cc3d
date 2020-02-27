#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace Exporter {
    public class AnimatorStateMachine {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorControllerLayer layer;
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorStateMachine parentStateMachine;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorStateMachine asset;
        [Hortor.Bon.BonProp(ignore = true)]
        public string fullPath;

        public int id;
        public string name;
        //public int nameHash;
        public List<int> states = new List<int>();
        public List<int> stateMachines = new List<int>();
        public int defaultState;
        public List<AnimatorStateTransition> anyStateTransitions = new List<AnimatorStateTransition>();
        public List<AnimatorStateTransition> entryTransitions = new List<AnimatorStateTransition>();

        public AnimatorStateMachine() {
        }

        public AnimatorStateMachine(AnimatorControllerLayer l, AnimatorStateMachine parentStateMachine, UnityEditor.Animations.AnimatorStateMachine sm) {
            this.layer = l;
            this.parentStateMachine = parentStateMachine;
            this.asset = sm;

            this.name = sm.name;
            this.fullPath = parentStateMachine == null ? sm.name : parentStateMachine.fullPath + "." + sm.name;
            this.id = UnityEngine.Animator.StringToHash(fullPath);
            l.stateMachines.Add(this);

            //this.nameHash = Animator.StringToHash(sm.name);
            this.defaultState = sm.defaultState == null ? 0 : l.stateMap[sm.defaultState];
            foreach (var s in sm.states) {
                states.Add(new AnimatorState(this, s.state).id);
            }
            foreach (var s in sm.stateMachines) {
                stateMachines.Add(new AnimatorStateMachine(l, this, s.stateMachine).id);
            }
            foreach (var t in sm.anyStateTransitions) {
                anyStateTransitions.Add(new AnimatorStateTransition(this, null, t));
            }
            foreach (var t in sm.entryTransitions) {
                entryTransitions.Add(new AnimatorStateTransition(this, null, t));
            }
        }
    }
}
#endif