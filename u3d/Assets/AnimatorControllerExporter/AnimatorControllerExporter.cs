#if UNITY_EDITOR
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEngine;

namespace Exporter {
    public class AnimatorControllerExporter: MonoBehaviour {
        public string debug = "debug.json";
        public string exportJson = "export.json";
        public string exportBon = "export.bin";

        public void TestDebug() {
            var animator = GetComponentInChildren<Animator>();
            if (animator == null) {
                return;
            }
            var ac = animator.runtimeAnimatorController;
            if (ac == null) {
                return;
            }
            var eac = new Exporter.AnimatorController(ac);
            eac.ExportDebug(debug);
        }

        public void TestExoprtJson() {
            var animator = GetComponentInChildren<Animator>();
            if (animator == null) {
                return;
            }
            var ac = animator.runtimeAnimatorController;
            if (ac == null) {
                return;
            }
            var eac = new Exporter.AnimatorController(ac);

            eac.ExportJson(exportJson);
        }

        public void TestExoprtBon() {
            var animator = GetComponentInChildren<Animator>();
            if (animator == null) {
                return;
            }
            var ac = animator.runtimeAnimatorController;
            if (ac == null) {
                return;
            }
            var eac = new Exporter.AnimatorController(ac);

            eac.ExportBon(exportBon);
        }
    }

    [CustomEditor(typeof(AnimatorControllerExporter), true)]
    public class AnimatorControllerExporterEditor: Editor {
        bool _showFunc = false;
        static GUIStyle _foldout = null;
        bool _showField = false;
        static GUIStyle _button = null;
        public override void OnInspectorGUI() {
            base.DrawDefaultInspector();

            if (_foldout == null) {
                _foldout = new GUIStyle(EditorStyles.radioButton);
                _foldout.richText = true;
            }
            if (_button == null) {
                _button = new GUIStyle(EditorStyles.toolbarButton);
                _button.richText = true;
            }
            _showFunc = EditorGUILayout.Foldout(_showFunc, "<color=green>FastFunc</color>", _foldout);
            if (_showFunc) {
                MonoBehaviour cls = target as MonoBehaviour;
                Type t = cls.GetType();
                MethodInfo[] methods = t.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                foreach (MethodInfo m in methods) {
                    ParameterInfo[] pms = m.GetParameters();
                    if (pms.Length > 0) {
                        string info = m.Name + "(" + string.Join(",", pms.Select(pm => pm.ParameterType.Name).ToArray()) + ")";
                        GUILayout.Label(info);
                    } else {
                        if (GUILayout.Button("<color=green>" + m.Name + "</color>", _button)) {
                            m.Invoke(target, null);
                        }
                    }
                }
            } else {
                MonoBehaviour cls = target as MonoBehaviour;
                if (cls != null) {
                    Type t = cls.GetType();
                    MethodInfo[] methods = t.GetMethods(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                    foreach (MethodInfo m in methods) {
                        ParameterInfo[] pms = m.GetParameters();
                        string name = m.Name.ToLower();
                        if (pms.Length == 0 && name.StartsWith("test")) {
                            if (GUILayout.Button("<color=#05D4F1>" + m.Name + "</color>", _button)) {
                                m.Invoke(target, null);
                            }
                        }
                    }
                }
            }
            _showField = EditorGUILayout.Foldout(_showField, "<color=green>Fields</color>", _foldout);
            if (_showField) {
                MonoBehaviour cls = target as MonoBehaviour;
                Type t = cls.GetType();
                var fields = t.GetFields(BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                foreach (var m in fields) {
                    string info = m.Name + ": " + m.GetValue(m.IsStatic ? null : target);
                    GUILayout.Label(info);
                }
            }
        }
    }
}
#endif