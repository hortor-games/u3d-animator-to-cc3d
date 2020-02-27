#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Exporter {
    public class AnimatorState {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorStateMachine parent;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorState asset;
        [Hortor.Bon.BonProp(ignore = true)]
        public string fullPath;

        public int id;
        public string name;
        //public int nameHash;
        public Motion motion;
        public float speed;
        public float cycleOffset;
        public bool mirror;
        //public bool iKOnFeet;
        public bool writeDefaultValues;
        //public string tag;
        public string speedParameter;
        public string cycleOffsetParameter;
        public string mirrorParameter;
        public string timeParameter;
        public List<AnimatorStateTransition> transitions = new List<AnimatorStateTransition>();
        //public object behaviours;

        public AnimatorState() {
        }

        public AnimatorState(AnimatorStateMachine sm, UnityEditor.Animations.AnimatorState s) {
            this.parent = sm;
            this.asset = s;

            this.name = s.name;
            this.fullPath = sm.fullPath + "." + s.name;
            this.id = UnityEngine.Animator.StringToHash(fullPath);
            sm.layer.states.Add(this);

            //this.nameHash = s.nameHash;
            if (s.motion != null) {
                var m = new Motion(s.motion);
                if (m.clip != null || m.children.Count > 0) {
                    this.motion = m;
                }
            }
            this.speed = s.speed;
            this.cycleOffset = s.cycleOffset;
            this.mirror = s.mirror;
            this.writeDefaultValues = s.writeDefaultValues;
            //this.speedParameter = s.speedParameterActive ? ac.parameters.First(p => p.name == s.speedParameter).nameHash : 0;
            //this.cycleOffsetParameter = s.cycleOffsetParameterActive ? ac.parameters.First(p => p.name == s.cycleOffsetParameter).nameHash : 0;
            //this.mirrorParameter = s.mirrorParameterActive ? ac.parameters.First(p => p.name == s.mirrorParameter).nameHash : 0;
            //this.timeParameter = s.timeParameterActive ? ac.parameters.First(p => p.name == s.timeParameter).nameHash : 0;
            this.speedParameter = s.speedParameterActive ? s.speedParameter : null;
            this.cycleOffsetParameter = s.cycleOffsetParameterActive ? s.cycleOffsetParameter : null;
            this.mirrorParameter = s.mirrorParameterActive ? s.mirrorParameter : null;
            this.timeParameter = s.timeParameterActive ? s.timeParameter : null;
            foreach (var t in s.transitions) {
                this.transitions.Add(new AnimatorStateTransition(sm, this, t));
            }
        }
    }
}
#endif