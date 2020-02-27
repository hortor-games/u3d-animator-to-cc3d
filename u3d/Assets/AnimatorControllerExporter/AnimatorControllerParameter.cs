#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

namespace Exporter {
    public class AnimatorControllerParameter {
        [Hortor.Bon.BonProp(ignore = true)]
        public AnimatorController parent;
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEngine.AnimatorControllerParameter asset;

        public string name;
        //public int nameHash;
        public int type;
        public object defaultValue;

        public AnimatorControllerParameter() {
        }

        public AnimatorControllerParameter(AnimatorController ac, UnityEngine.AnimatorControllerParameter p) {
            this.parent = ac;
            this.asset = p;
            this.name = p.name;
            //this.nameHash = p.nameHash;
            this.type = (int)(p.type == AnimatorControllerParameterType.Int ? AnimatorControllerParameterType.Float : p.type);
            switch (p.type) {
                case AnimatorControllerParameterType.Float: this.defaultValue = p.defaultFloat; break;
                case AnimatorControllerParameterType.Int: this.defaultValue = p.defaultInt; break;
                default: this.defaultValue = p.defaultBool; break;
            }
        }
    }

}
#endif