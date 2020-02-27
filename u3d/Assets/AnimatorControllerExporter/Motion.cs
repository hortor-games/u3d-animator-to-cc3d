#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Exporter {
    public class Motion {
        [Hortor.Bon.BonProp(ignore = true)]
        public UnityEditor.Animations.BlendTree btAsset;

        public int type;
        public string clip;
        public int blendType;
        public string blendParameter;
        public string blendParameterY;
        //public bool useAutomaticThresholds;
        //public float minThreshold;
        //public float maxThreshold;
        //public float averageDuration;
        //public float averageAngularSpeed;
        //public object averageSpeed;
        //public float apparentSpeed;
        //public bool isLooping;
        //public bool legacy;
        //public bool isHumanMotion;
        //public bool isAnimatorMotion;
        //public string name;
        public List<ChildMotion> children;

        public Motion() {
        }

        public Motion(UnityEngine.Motion m) {
            switch (m) {
                case UnityEditor.Animations.BlendTree bt: {
                    this.btAsset = bt;
                    this.type = 1;
                    this.blendType = (int)bt.blendType;
                    this.blendParameter = bt.blendParameter;
                    this.blendParameterY = bt.blendParameterY;
                    this.children = new List<ChildMotion>();
                    foreach (var cm in bt.children) {
                        if (cm.motion == null) {
                            continue;
                        }
                        var c = new ChildMotion(this, cm);
                        if (c.motion == null) {
                            continue;
                        }
                        this.children.Add(c);
                    }
                    break;
                }
                case UnityEngine.AnimationClip ac: {
                    this.type = 0;
                    this.clip = ac.name;
                    break;
                }
            }
        }
    }

    public class Vec2 {
        public float x;
        public float y;
    }

    public class ChildMotion {
        public float threshold;
        public Vec2 position;
        public float timeScale;
        //public float cycleOffset;
        public string directBlendParameter;
        //public bool mirror;
        public Motion motion;

        public ChildMotion() {

        }

        public ChildMotion(Motion bt, UnityEditor.Animations.ChildMotion cm) {
            this.timeScale = cm.timeScale;
            switch (bt.btAsset.blendType) {
                case UnityEditor.Animations.BlendTreeType.Simple1D: {
                    this.threshold = cm.threshold;
                    break;
                }
                case UnityEditor.Animations.BlendTreeType.Direct: {
                    this.directBlendParameter = cm.directBlendParameter;
                    break;
                }
                default: {
                    this.position = new Vec2 { x = cm.position.x, y = cm.position.y };
                    break;

                }
            }
            if (cm.motion != null) {
                var m = new Motion(cm.motion);
                if (m.clip != null || m.children.Count > 0) {
                    this.motion = new Motion(cm.motion);
                }
            }
        }
    }
}
#endif