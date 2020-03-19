#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;
using System.Reflection;

namespace Exporter {

    public static class ExportEditor {
        static string path = "";
        [UnityEditor.MenuItem("GameObject/AnimatorControllerExporter/ExportJson", priority = 49)]
        public static void ExportGameObjectJson() {
            var go = UnityEditor.Selection.activeGameObject;
            ExportJson(go);
        }

        [UnityEditor.MenuItem("Assets/AnimatorControllerExporter/ExportJson", priority = 49)]
        public static void ExportAssetToJson() {
            switch (UnityEditor.Selection.activeObject) {
                case GameObject go: ExportJson(go); break;
                case UnityEditor.Animations.AnimatorController ac: ExportJson(ac); break;
            }
        }

        static void ExportJson(GameObject go) {
            if (go == null) {
                return;
            }
            var animator = go.GetComponentInChildren<Animator>();
            if (animator == null) {
                return;
            }
            var ac = animator.runtimeAnimatorController as UnityEditor.Animations.AnimatorController;
            ExportJson(ac);
        }

        static void ExportJson(UnityEditor.Animations.AnimatorController ac) {
            if (ac == null) {
                return;
            }

            var name = ac.name;
            var path2 = UnityEditor.EditorUtility.SaveFilePanel("导出", path, name, "json");
            if (string.IsNullOrWhiteSpace(path2)) {
                return;
            }
            path = path2;

            var eac = new Exporter.AnimatorController(ac);
            eac.ExportJson(path2);
        }

        [UnityEditor.MenuItem("GameObject/AnimatorControllerExporter/ExportBon", priority = 49)]
        public static void ExportGameObjectBon() {
            var go = UnityEditor.Selection.activeGameObject;
            ExportBon(go);
        }

        [UnityEditor.MenuItem("Assets/AnimatorControllerExporter/ExportBon", priority = 49)]
        public static void ExportAssetToBon() {
            switch (UnityEditor.Selection.activeObject) {
                case GameObject go: ExportBon(go); break;
                case UnityEditor.Animations.AnimatorController ac: ExportBon(ac); break;
            }
        }

        static void ExportBon(GameObject go) {
            if (go == null) {
                return;
            }
            var animator = go.GetComponentInChildren<Animator>();
            if (animator == null) {
                return;
            }
            var ac = animator.runtimeAnimatorController as UnityEditor.Animations.AnimatorController;
            ExportBon(ac);
        }

        static void ExportBon(UnityEditor.Animations.AnimatorController ac) {
            if (ac == null) {
                return;
            }

            var name = ac.name;
            var path2 = UnityEditor.EditorUtility.SaveFilePanel("导出", path, name, "bin");
            if (string.IsNullOrWhiteSpace(path2)) {
                return;
            }
            path = path2;

            var eac = new Exporter.AnimatorController(ac);
            eac.ExportBon(path2);
        }
    }

}
#endif