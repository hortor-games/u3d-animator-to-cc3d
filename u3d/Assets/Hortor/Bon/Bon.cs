using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Reflection;
using UnityEngine;

namespace Hortor.Bon {
    public static class BonExt {
        public static string ToJsonString(this BonValue v, bool format = false) {
            var enc = new JsonEncoder(format);
            enc.Encode(v);
            return enc.Result();
        }

        public static byte[] ToBonBytes(this BonValue v) {
            var enc = new BonEncoder();
            enc.Encode(v);
            return enc.Result();
        }

        public static T ToObject<T>(this BonValue v) {
            T obj = default;
            ToObject(v, ref obj);
            return obj;
        }

        public static void ToObject<T>(this BonValue v, ref T obj) {
            var nobj = ToObject(v, obj, typeof(T));
            if (nobj == null) {
                obj = default;
                return;
            }
            obj = (T)nobj;
        }

        internal static object ToObject(this BonValue v, object obj, Type t) {
            if (v == null) {
                return null;
            }
            switch (t.Name) {
                case "Byte": return (byte)v.AsInt;
                case "SByte": return (sbyte)v.AsInt;
                case "Int16": return (short)v.AsInt;
                case "UInt16": return (ushort)v.AsInt;
                case "Int32": return v.AsInt;
                case "UInt32": return (uint)v.AsInt;
                case "Int64": return v.AsLong;
                case "UInt64": return (ulong)v.AsLong;
                case "Single": return v.AsFloat;
                case "Double": return v.AsDouble;
                case "Boolean": return v.AsBoolean;
                case "String": return v.AsString;
                case "Byte[]": return v.AsBinary;
                case "DateTime": return v.AsDateTime;
            }

            switch (t) {
                case var _ when t == typeof(object) || t == typeof(BonValue): return v;
                case var _ when typeof(BonValue).IsAssignableFrom(t): {
                    if (v.GetType() != t) {
                        return null;
                    }
                    return v;
                }
                case var _ when typeof(IList).IsAssignableFrom(t) && t.IsGenericType: {
                    BonArray arr = v.AsBonArray;
                    if (arr == null) {
                        return null;
                    }
                    int num = arr.Count;
                    if (!(obj is IList l)) {
                        l = (IList)Activator.CreateInstance(t, num);
                    }
                    Type t2 = t.GetGenericArguments()[0];
                    l.Clear();
                    for (int i = 0; i < num; i++) {
                        l.Add(ToObject(arr[i], null, t2));
                    }
                    return l;
                }
                case var _ when typeof(IDictionary).IsAssignableFrom(t) && t.IsGenericType: {
                    BonDocument doc = v.AsBonDocument;
                    if (doc == null) {
                        return null;
                    }
                    int num = doc.Count;
                    if (!(obj is IDictionary d)) {
                        d = (IDictionary)Activator.CreateInstance(t, num);
                    }
                    Type[] t2s = t.GetGenericArguments();
                    Type tk = t2s[0];
                    Type t2 = t2s[1];
                    for (int i = 0; i < num; i++) {
                        BonElement elem = doc[i];
                        object key = null;
                        switch (tk.Name) {
                            case "UInt32": key = Convert.ToUInt32(elem.name); break;
                            case "Int32": key = Convert.ToInt32(elem.name); break;
                            case "Int64": key = Convert.ToInt64(elem.name); break;
                            case "UInt64": key = Convert.ToUInt64(elem.name); break;
                            case "String": key = elem.name; break;
                            default: {
                                if (tk.IsEnum) {
                                    key = Enum.ToObject(tk, Convert.ToInt32(elem.name));
                                }
                                break;
                            }
                        }
                        if (key != null) {
                            BonValue v2 = elem.value;
                            object vobj = null;
                            if (d.Contains(key)) {
                                vobj = ToObject(v2, d[key], t2);
                            } else {
                                vobj = ToObject(v2, null, t2);
                            }
                            if (vobj == null) {
                                d.Remove(key);
                            } else {
                                d[key] = vobj;
                            }
                        }
                    }
                    return d;
                }
                case var _ when t.IsEnum: {
                    return Enum.ToObject(t, v.AsInt);
                }
                case var _ when t.IsArray: {
                    BonArray arr = v.AsBonArray;
                    if (arr == null) {
                        return null;
                    }
                    int num = arr.Count;
                    Type t2 = t.GetElementType();
                    var a = Array.CreateInstance(t2, num);
                    for (int i = 0; i < num; i++) {
                        a.SetValue(ToObject(arr[i], null, t2), i);
                    }
                    return a;
                }
                default: {
                    if (!v.IsBonDocument) {
                        return null;
                    }
                    {
                        BonDocument doc = v.AsBonDocument;
                        string _t_ = doc.GetString("_t_");
                        TypeInfo ti = null;
                        if (_t_ != null) {
                            ti = TypeInfo.Of(_t_);
                            if (ti == null) {
                                Debug.LogError("未找到类型: " + _t_);
                            }
                        } else {
                            ti = TypeInfo.Of(t);
                        }
                        if (ti == null) {
                            return null;
                        }
                        if (obj != null && obj.GetType() != t) {
                            obj = null;
                        }
                        if (obj == null) {
                            obj = Activator.CreateInstance(t);
                        }

                        bool isValueType = t.IsValueType;
                        int num = doc.Count;
                        for (int i = 0; i < num; i++) {
                            BonElement el = doc[i];
                            if (!ti.aliasProps.TryGetValue(el.name, out var pi) || !pi.canWrite) {
                                continue;
                            }
                            var oldv = pi.GetValue(obj);
                            var newv = ToObject(el.value, oldv, pi.type);
                            pi.SetValue(obj, newv);
                        }
                        return obj;
                    }
                }
            }
        }
    }

    public static class BonUtil {
        public class Config {
            public bool debug = false;
            public bool omitempty = true;
            public bool typeInfo = true;
        }

        private static readonly Config DefaultConfig = new Config { typeInfo = true };

        private class Serializer {

        }

        public static BonValue FromBonBytes(byte[] bon) {
            return new BonDecoder().Decode(bon);
        }

        public static BonValue FromJsonString(string json) {
            return new JsonDecoder().Decode(json);
        }

        public static BonValue ToBon<T>(T obj, Config cfg = null) {
            return ToBon(obj, typeof(T), cfg);
        }

        public static BonValue ToBon(object obj, Type dt, Config cfg = null) {
            cfg = cfg ?? DefaultConfig;


            return ToBon(obj, dt, cfg, cfg.debug ? new Dictionary<object, BonValue>() : null);
        }

        private static BonValue ToBon(object obj, Type dt, Config cfg, Dictionary<object, BonValue> anti) {
            if (obj == null) {
                return BonNull.value;
            }
            Type t = obj.GetType();
            switch (obj) {
                case byte vv: return (int)vv;
                case sbyte vv: return (int)vv;
                case short vv: return (int)vv;
                case ushort vv: return (int)vv;
                case int vv: return vv;
                case uint vv: return (int)vv;
                case long vv: return vv;
                case ulong vv: return (long)vv;
                case float vv: return vv;
                case double vv: return vv;
                case bool vv: return vv;
                case string vv: return vv;
                case byte[] vv: return vv;
                case DateTime vv: return vv;
                case var _ when obj is Enum: return (int)obj;
                case BonValue vv: return vv;
                case Array vv: {
                    Type et = t.GetElementType();
                    BonArray arr = new BonArray();
                    foreach (object i in vv) {
                        BonValue v2 = ToBon(i, et, cfg, anti);
                        arr.Add(v2);
                    }
                    return arr;
                }
                case IList vv when t.IsGenericType: {
                    Type et = t.GenericTypeArguments[0];
                    BonArray arr = new BonArray();
                    foreach (object i in vv) {
                        BonValue v2 = ToBon(i, et, cfg, anti);
                        arr.Add(v2);
                    }
                    return arr;
                }
                case IDictionary vv when t.IsGenericType: {
                    Type kt = t.GetGenericArguments()[0];
                    Type et = t.GetGenericArguments()[1];
                    BonDocument doc = new BonDocument();
                    foreach (DictionaryEntry kv in vv) {
                        string name = null;
                        if (kt.IsEnum) {
                            name = ((int)kv.Key).ToString();
                        } else {
                            name = kv.Key.ToString();
                        }
                        if (name == null) {
                            continue;
                        }
                        BonValue v2 = ToBon(kv.Value, et, cfg, anti);
                        doc[name] = v2;
                    }
                    return doc;
                }
                default: {
                    if (cfg.debug) {
                        if (anti.TryGetValue(obj, out var bon)) {
                            return new BonDocument { ["_ref_"] = bon.AsBonDocument["_id_"] };
                        }
                    }
                    TypeInfo ti = TypeInfo.Of(t);
                    BonDocument doc = new BonDocument();
                    if (cfg.debug) {
                        doc["_id_"] = Guid.NewGuid().ToString("N");
                        anti.Add(obj, doc);
                    }
                    if (dt != null && dt != t || cfg.debug) {
                        doc["_t_"] = t.FullName;
                    }
                    foreach (var kv in ti.props) {
                        PropInfo pi = kv.Value;
                        if (!pi.canRead) {
                            continue;
                        }
                        var v = kv.Value.GetValue(obj);
                        if (!cfg.debug && cfg.omitempty) {
                            if (v == null) {
                                continue;
                            }
                            if (pi.type.IsValueType) {
                                if (v.Equals(Activator.CreateInstance(pi.type))) {
                                    continue;
                                }
                            }
                        }
                        BonValue v2 = ToBon(v, pi.type, cfg, anti);
                        doc[pi.alias] = v2;
                    }
                    return doc;
                }
            }

        }


    }
}
