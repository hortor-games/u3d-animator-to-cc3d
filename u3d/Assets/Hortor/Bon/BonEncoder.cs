using Hortor.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hortor.Bon {
    public class BonEncoder {
        private readonly DataWriter dw = new DataWriter();
        private Dictionary<string, int> strMap = new Dictionary<string, int>();

        public BonEncoder() {
            this.Reset();
        }

        public void Reset() {
            this.dw.Reset();
            this.strMap.Clear();
        }


        public void Encode(int v) {
            this.dw.Write((byte)BonTypes.Int);
            this.dw.Write(v);
        }
        public void Encode(long v) {
            this.dw.Write((byte)BonTypes.Long);
            this.dw.Write(v);
        }
        public void Encode(float v) {
            this.dw.Write((byte)BonTypes.Float);
            this.dw.Write(v);
        }
        public void Encode(double v) {
            this.dw.Write((byte)BonTypes.Double);
            this.dw.Write(v);
        }
        public void Encode(string v) {
            if (this.strMap.TryGetValue(v, out var idx)) {
                this.dw.Write((byte)BonTypes.StringRef);
                this.dw.Write7BitEncodedInt(idx);
            } else {
                this.dw.Write((byte)BonTypes.String);
                var bytes = UTF8Encoding.UTF8.GetBytes(v);
                this.dw.Write7BitEncodedInt(bytes.Length);
                this.dw.Write(bytes);
                this.strMap[v] = this.strMap.Count;
            }
        }
        public void Encode(bool v) {
            this.dw.Write((byte)BonTypes.Boolean);
            this.dw.Write(v);
        }
        public void EncodeNull() {
            this.dw.Write((byte)BonTypes.Null);
        }
        public void Encode(DateTime v) {
            this.dw.Write((byte)BonTypes.DateTime);
            this.dw.Write((long)(v - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).Milliseconds);
        }
        public void Encode(byte[] v) {
            this.dw.Write((byte)BonTypes.Binary);
            this.dw.Write7BitEncodedInt(v.Length);
            this.dw.Write(v);
        }

        public void Encode(BonValue v) {
            switch (v) {
                default: EncodeNull(); return;
                case BonInt vv: Encode(vv.value); return;
                case BonLong vv: Encode(vv.value); return;
                case BonFloat vv: Encode(vv.value); return;
                case BonDouble vv: Encode(vv.value); return;
                case BonBoolean vv: Encode(vv.value); return;
                case BonString vv: Encode(vv.value); return;
                case BonBinary vv: Encode(vv.value); return;
                case BonDateTime vv: Encode(vv.value); return;
                case BonArray vv: {
                    this.dw.Write((byte)BonTypes.Array);
                    var c = vv.Count;
                    this.dw.Write7BitEncodedInt(c);
                    for (var i = 0; i < c; i++) {
                        Encode(vv[i]);
                    }
                    return;
                }
                case BonDocument vv: {
                    this.dw.Write((byte)BonTypes.Document);
                    var c = vv.Count;
                    this.dw.Write7BitEncodedInt(c);
                    for (var i = 0; i < c; i++) {
                        var elem = vv[i];
                        Encode(elem.name);
                        Encode(elem.value);
                    }
                    return;
                }
            }
        }


        public byte[] Result() {
            return this.dw.ToArray();
        }

        //private void Next(object v) {
        //    //var t = v.GetType();
        //    switch (v) {
        //        case null: this.EncodeNull(); break;
        //        case IBon vv: vv.BonEncode(this); break;
        //        case byte _:
        //        case sbyte _:
        //        case short _:
        //        case ushort _:
        //        case int _:
        //        case uint _:
        //            this.Encode(Convert.ToInt32(v)); break;
        //        case long _:
        //        case ulong _: this.Encode(Convert.ToInt64(v)); break;
        //        case float vv: this.Encode(vv); break;
        //        case double vv: this.Encode(vv); break;
        //        case bool vv: this.Encode(vv); break;
        //        case string vv: this.Encode(vv); break;
        //        case byte[] vv: this.Encode(vv); break;
        //        case DateTime vv: this.Encode(vv); break;
        //        case var vv when vv is Enum: this.Encode((int)v); break;
        //        default: {
        //            if (v is IList) {
        //                this.EncodeArray((IList)v);
        //                break;
        //            }
        //            if (v is IDictionary) {
        //                this.EncodeMap((IDictionary)v);
        //                break;
        //            }
        //            {
        //                this.EncodeObject(v);
        //            }
        //            break;
        //        }
        //    }
        //}
    }
}
