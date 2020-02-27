using System;
using System.IO;
using System.Text;
using UnityEngine;
namespace Hortor.Bon {
    public class BonString: BonValue {
        public string value;
        public BonString() {
        }
        public BonString(string v) {
            value = v;
        }
        public override bool AsBoolean {
            get { return !(value.ToLower() == "false" || value == "0" || string.IsNullOrEmpty(value)); }
        }

        public override double AsDouble {
            get {
                double v;
                return double.TryParse(value, out v) ? v : 0.0;
            }
        }

        public override int AsInt {
            get {
                int v;
                return int.TryParse(value, out v) ? v : 0;
            }
        }

        public override float AsFloat {
            get {
                float v;
                return float.TryParse(value, out v) ? v : 0f;
            }
        }

        public override long AsLong {
            get {
                long v;
                return long.TryParse(value, out v) ? v : 0L;
            }
        }

        public override byte[] AsBinary {
            get {
                try {
                    return Convert.FromBase64String(value);
                } catch (Exception e) {
                    Debug.LogError(e);
                    return null;
                }
            }
        }

        public override DateTime AsDateTime {
            get {
                if (DateTime.TryParse(value, out var v)) {
                    return v;
                }
                return UTC_ZERO;
            }
        }

        public override string AsString {
            get { return value; }
        }

        public override bool IsString {
            get { return true; }
        }


    }
}