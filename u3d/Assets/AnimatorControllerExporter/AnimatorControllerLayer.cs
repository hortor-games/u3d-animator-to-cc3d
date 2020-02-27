#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Exporter {
    public class AnimatorControllerLayer {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorController parent;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorControllerLayer asset;
        [Hortor.Bon.BonProp(ignore = true)]
        public Dictionary<UnityEditor.Animations.AnimatorStateMachine, int> stateMachineMap = new Dictionary<UnityEditor.Animations.AnimatorStateMachine, int>();
        [Hortor.Bon.BonProp(ignore = true)]
        public Dictionary<UnityEditor.Animations.AnimatorState, int> stateMap = new Dictionary<UnityEditor.Animations.AnimatorState, int>();
        //[Hortor.Bon.BonProp(ignore = true)]
        //public Dictionary<>

        public string name;
        public List<AnimatorStateMachine> stateMachines = new List<AnimatorStateMachine>();
        public List<AnimatorState> states = new List<AnimatorState>();
        public int stateMachine;
        public string avatarMask;
        public int blendingMode;
        public int syncedLayerIndex;
        //public bool iKPass;
        public float defaultWeight;
        public bool syncedLayerAffectsTiming;

        public AnimatorControllerLayer() {
        }

        public AnimatorControllerLayer(AnimatorController ac, UnityEditor.Animations.AnimatorControllerLayer l) {
            System.Action<UnityEditor.Animations.AnimatorStateMachine, UnityEditor.Animations.AnimatorStateMachine, string> addStateMachineMap = null;
            System.Action<UnityEditor.Animations.AnimatorState, UnityEditor.Animations.AnimatorStateMachine, string> addStateMap = null;
            addStateMachineMap = (sm, parent, fullPath) => {
                fullPath = fullPath == null ? sm.name : fullPath + "." + sm.name;
                stateMachineMap[sm] = UnityEngine.Animator.StringToHash(fullPath);
                sm.stateMachines.ToList().ForEach(p => {
                    addStateMachineMap(p.stateMachine, sm, fullPath);
                });
                sm.states.ToList().ForEach(p => {
                    addStateMap(p.state, sm, fullPath);
                });
            };
            addStateMap = (s, sm, fullPath) => {
                fullPath = fullPath + "." + s.name;
                stateMap[s] = UnityEngine.Animator.StringToHash(fullPath);
                //stateToMachineMap[s] = sm;
            };

            addStateMachineMap(l.stateMachine, null, null);

            this.parent = ac;
            this.asset = l;
            this.name = l.name;
            this.avatarMask = l.avatarMask?.name;
            this.stateMachine = new AnimatorStateMachine(this, null, l.stateMachine).id;
            this.blendingMode = (int)l.blendingMode;
            this.syncedLayerIndex = l.syncedLayerIndex;
            this.defaultWeight = ac.layers.Count == 0 ? 1 : l.defaultWeight;
            this.syncedLayerAffectsTiming = l.syncedLayerAffectsTiming;
        }

    }
}
#endif