using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Reflection;

namespace Hortor.Bon {
    [AttributeUsage(AttributeTargets.Field | AttributeTargets.Property, Inherited = true)]
    public class BonPropAttribute: Attribute {
        public bool ignore;
        public string alias;
        public Type Coder;
    }


    public class TypeInfo {
        private static ConcurrentDictionary<string, Type> types = new ConcurrentDictionary<string, Type>();
        private static ConcurrentDictionary<Type, TypeInfo> typeInfos = new ConcurrentDictionary<Type, TypeInfo>();

        public static TypeInfo Of(Type t) {
            return typeInfos.GetOrAdd(t, t2 => new TypeInfo(t2));
        }

        public static TypeInfo Of<T>() {
            return Of(typeof(T));
        }

        public static TypeInfo Of(string t) {
            var nt = types.GetOrAdd(t, t2 => {
                Type tt = Type.GetType(t);
                if (tt != null) {
                    return tt;
                }

                Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
                foreach (var a in assemblies) {
                    tt = a.GetType(t);
                    if (tt != null) {
                        return tt;
                    }
                }

                return null;
            });
            return nt == null ? null : Of(nt);
        }

        public Type type;
        public Dictionary<string, PropInfo> props = new Dictionary<string, PropInfo>();
        public Dictionary<string, PropInfo> aliasProps = new Dictionary<string, PropInfo>();

        private TypeInfo(Type t) {
            this.type = t;
            foreach (var fi in t.GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic)) {
                var att = fi.GetCustomAttribute<BonPropAttribute>();
                if (att != null && att.ignore) {
                    continue;
                }

                if (fi.IsPublic || att != null) {
                    var bpi = new PropInfo(fi, att);
                    props[bpi.name] = bpi;
                    aliasProps[bpi.alias] = bpi;
                }
            }

            foreach (var pi in t.GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.NonPublic)) {
                if (!pi.CanRead && !pi.CanWrite || pi.GetIndexParameters().Length > 0) {
                    continue;
                }
                var att = pi.GetCustomAttribute<BonPropAttribute>();
                //if (att == null || att.ignore) { // 没有标记或者被标记成忽略的属性跳过
                //    continue;
                //}
                if (att != null && att.ignore) {
                    continue;
                }

                if (pi.CanRead && pi.GetMethod.IsPublic || pi.CanWrite && pi.SetMethod.IsPublic || att != null) {
                    var bpi = new PropInfo(pi, att);
                    props[bpi.name] = bpi;
                    aliasProps[bpi.alias] = bpi;
                }
            }
        }
    }

    public class PropInfo {
        public FieldInfo fi;
        public PropertyInfo pi;
        public Type type;
        public BonPropAttribute propAtt;
        public string name;
        public string alias;
        public bool canRead;
        public bool canWrite;

        public PropInfo(FieldInfo fi, BonPropAttribute att) {
            this.fi = fi;
            this.name = fi.Name;
            this.type = fi.FieldType;
            this.propAtt = att;
            this.alias = propAtt != null && propAtt.alias != null ? propAtt.alias : name;
            this.canRead = this.canWrite = true;
        }

        public PropInfo(PropertyInfo pi, BonPropAttribute att) {
            this.pi = pi;
            this.name = pi.Name;
            this.type = pi.PropertyType;
            this.propAtt = att;
            this.alias = propAtt != null && propAtt.alias != null ? propAtt.alias : name;
            this.canRead = pi.CanRead;
            this.canWrite = pi.CanWrite;
        }

        public object GetValue(object target) {
            return fi != null ? fi.GetValue(target) : pi.GetValue(target);
        }

        public void SetValue(object target, object value) {
            if (fi != null) {
                fi.SetValue(target, value);
            } else {
                pi.SetValue(target, value);
            }
        }
    }
}