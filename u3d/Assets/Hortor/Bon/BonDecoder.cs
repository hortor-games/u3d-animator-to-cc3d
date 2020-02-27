using Hortor.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hortor.Bon {
    public class BonDecoder {
        private DataReader dr;
        private readonly List<string> strArr;

        public BonDecoder() {
            this.strArr = new List<string>();
        }

        public void Reset() {
            this.dr = null;
            this.strArr.Clear();
        }

        public BonValue Decode(byte[] bytes) {
            this.Reset();
            this.dr = new DataReader(bytes);
            return this.Next();
        }

        private BonValue Next() {
            var t = (BonTypes)this.dr.ReadByte();
            switch (t) {
                default: {
                    return BonNull.value;
                }
                case BonTypes.Int: {
                    return this.dr.ReadInt32();
                }
                case BonTypes.Long: {
                    return this.dr.ReadInt64();
                }
                case BonTypes.Float: {
                    return this.dr.ReadSingle();
                }
                case BonTypes.Double: {
                    return this.dr.ReadDouble();
                }
                case BonTypes.String: {
                    var len = this.dr.Read7BitEncodedInt();
                    var s = this.dr.ReadUTF(len);
                    this.strArr.Add(s);
                    return s;
                }
                case BonTypes.Boolean: {
                    return this.dr.ReadBoolean();
                }
                case BonTypes.Binary: {
                    return this.dr.ReadBytes(this.dr.Read7BitEncodedInt());
                }
                case BonTypes.Document: {
                    var len = this.dr.Read7BitEncodedInt();
                    var obj = new BonDocument();
                    for (var i = 0; i < len; i++) {
                        var k = this.Next().ToString();
                        var v = this.Next();
                        obj[k] = v;
                    }
                    return obj;
                }
                case BonTypes.Array: {
                    var len = this.dr.Read7BitEncodedInt();
                    var arr = new BonArray();
                    for (var i = 0; i < len; i++) {
                        arr.Add(this.Next());
                    }
                    return arr;
                }
                case BonTypes.DateTime: {
                    return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(this.dr.ReadInt64());
                }
                case BonTypes.StringRef: {
                    return this.strArr[this.dr.Read7BitEncodedInt()];
                }
            }
        }

        //private void Skip() {
        //    var t = (BonTypes)this.dr.ReadByte();
        //    switch (t) {
        //        default: {
        //            return;
        //        }
        //        case BonTypes.Float:
        //        case BonTypes.Int: {
        //            this.dr.BaseStream.Position += 4;
        //            return;
        //        }
        //        case BonTypes.DateTime:
        //        case BonTypes.Double:
        //        case BonTypes.Long: {
        //            this.dr.BaseStream.Position += 8;
        //            return;
        //        }
        //        case BonTypes.Binary:
        //        case BonTypes.String: {
        //            this.dr.BaseStream.Position--;
        //            this.Next();
        //            return;
        //        }
        //        case BonTypes.Boolean: {
        //            this.dr.BaseStream.Position++;
        //            return;
        //        }
        //        case BonTypes.Document: {
        //            var len = this.dr.Read7BitEncodedInt();
        //            for (var i = 0; i < len; i++) {
        //                this.Skip();
        //                this.Skip();
        //            }
        //            return;
        //        }
        //        case BonTypes.Array: {
        //            var len = this.dr.Read7BitEncodedInt();
        //            for (var i = 0; i < len; i++) {
        //                this.Skip();
        //            }
        //            return;
        //        }
        //        case BonTypes.StringRef: {
        //            this.dr.Read7BitEncodedInt();
        //            return;
        //        }
        //    }
        //}


        //public void Decode<T>(byte[] bytes, ref T obj) {
        //    this.Reset();
        //    this.dr = new DataReader(bytes);
        //    this.Next(ref obj);
        //}

        //private object Next(Type t) {
        //    switch (t) {
        //        default: Next(); return null;
        //        case typeof(ushort):
        //        case typeof(short):
        //        case typeof(int):
        //        case typeof(sbyte):
        //        case typeof(ushort):
        //        case typeof(uint):
        //        case var vv when vv is Enum: {
        //            obj = (T)(object)Next().AsBonInt();
        //            return;
        //        }
        //        case long _:
        //        case ulong _: {
        //            obj = (T)(object)Next().AsBonLong();
        //            return;
        //        }
        //        case float _: {
        //            obj = (T)(object)Next().AsBonFloat();
        //            return;
        //        }
        //        case double _: {
        //            obj = (T)(object)Next().AsBonDouble();
        //            return;
        //        }
        //        case DateTime _: {
        //            obj = (T)(object)Next().AsBonDatetime();
        //            return;
        //        }
        //        case string _: {
        //            obj = (T)(object)Next().AsBonString();
        //            return;
        //        }
        //        case byte[] _: {
        //            obj = (T)(object)Next().AsBonBinary();
        //            return;
        //        }
        //        case bool _: {
        //            obj = (T)(object)Next().AsBonBool();
        //            return;
        //        }
        //        case IDictionary vv: {
        //            var t = (BonTypes)this.dr.ReadByte();
        //            if (t != BonTypes.Document) {
        //                obj = default;
        //                return;
        //            }

        //            var t = typeof(T);
        //            if (vv == null) {
        //                vv = (IDictionary)Activator.CreateInstance(t);
        //            }
        //            Type kt = t.IsGenericType ? t.GetGenericArguments()[0] : null;
        //            foreach (var kv in v2) {
        //                switch (kt) {
        //                    case typeof(int):
        //                        kt
        //                }
        //            }
        //            object key = null;
        //            if (t.IsGenericType) {
        //                var ts = t.GetGenericArguments();
        //                switch (ts[0]) {
        //                    case typeof(int): {
        //                        key =
        //                    }
        //                }
        //            }

        //            obj = (T)(object)v.AsBonBool();
        //            return;
        //        }

        //        default: {
        //            return null;
        //        }
        //        case BonTypes.Int: {
        //            return this.dr.ReadInt32();
        //        }
        //        case BonTypes.Long: {
        //            return this.dr.ReadInt64();
        //        }
        //        case BonTypes.Float: {
        //            return this.dr.ReadSingle();
        //        }
        //        case BonTypes.Double: {
        //            return this.dr.ReadDouble();
        //        }
        //        case BonTypes.String: {
        //            var len = this.dr.Read7BitEncodedInt();
        //            var s = this.dr.ReadUTF(len);
        //            this.strArr.Add(s);
        //            return s;
        //        }
        //        case BonTypes.Boolean: {
        //            return this.dr.ReadBoolean();
        //        }
        //        case BonTypes.Binary: {
        //            return this.dr.ReadBytes(this.dr.Read7BitEncodedInt());
        //        }
        //        case BonTypes.Document: {
        //            var len = this.dr.Read7BitEncodedInt();
        //            var obj = new Dictionary<string, object>();
        //            for (var i = 0; i < len; i++) {
        //                var k = this.Next().ToString();
        //                var v = this.Next();
        //                obj[k] = v;
        //            }
        //            return obj;
        //        }
        //        case BonTypes.Array: {
        //            var len = this.dr.Read7BitEncodedInt();
        //            var arr = new List<object>(len);
        //            for (var i = 0; i < len; i++) {
        //                arr.Add(this.Next());
        //            }
        //            return arr;
        //        }
        //        case BonTypes.DateTime: {
        //            return new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(this.dr.ReadInt64());
        //        }
        //        case BonTypes.StringRef: {
        //            return this.strArr[this.dr.Read7BitEncodedInt()];
        //        }
        //    }
        //}


    }
}
