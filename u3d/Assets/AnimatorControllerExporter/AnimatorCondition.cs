#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Exporter {
    public class AnimatorCondition {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorStateTransition parent;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorCondition asset;

        public int mode;
        public string parameter;
        public float threshold;

        public AnimatorCondition() {

        }

        public AnimatorCondition(AnimatorStateTransition t, UnityEditor.Animations.AnimatorCondition c) {
            this.parent = t;
            this.asset = c;

            this.mode = (int)c.mode;
            this.parameter = c.parameter;// ac.parameters.First(p => p.name == c.parameter).nameHash;
            this.threshold = c.threshold;
        }
    }
}
#endif