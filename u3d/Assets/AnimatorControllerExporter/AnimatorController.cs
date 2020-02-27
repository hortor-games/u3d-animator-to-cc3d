#if UNITY_EDITOR
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Hortor.Bon;

namespace Exporter {
    public class AnimatorController {
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.AnimatorController asset;


        public List<AnimatorControllerParameter> parameters = new List<AnimatorControllerParameter>();
        public List<AnimatorControllerLayer> layers = new List<AnimatorControllerLayer>();
        //public object animationClips;

        public AnimatorController() {

        }
        public AnimatorController(UnityEditor.Animations.AnimatorController ac) {
            this.asset = ac;
            foreach (var p in ac.parameters) {
                parameters.Add(new AnimatorControllerParameter(this, p));
            }
            foreach (var p in ac.layers) {
                layers.Add(new AnimatorControllerLayer(this, p));
            }
        }

        public void ExportJson(string path) {
            var bon = BonUtil.ToBon(this, new BonUtil.Config { omitempty = true, typeInfo = false });
            System.IO.File.WriteAllText(path, bon.ToJsonString(true));
        }

        public void ExportBon(string path) {
            var bon = BonUtil.ToBon(this, new BonUtil.Config { omitempty = true, typeInfo = false });
            System.IO.File.WriteAllBytes(path, bon.ToBonBytes());
        }

        public void ExportDebug(string path) {
            var bon = BonUtil.ToBon(this.asset, new BonUtil.Config { debug = true });
            System.IO.File.WriteAllText(path, bon.ToJsonString(true));
        }
    }
}
#endif