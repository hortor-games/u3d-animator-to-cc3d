using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonBinary: BonValue {
        public byte[] value;

        public BonBinary() {
        }

        public BonBinary(byte[] v) {
            value = v;
        }

        public override byte[] AsBinary {
            get { return value; }
        }

        public override bool IsBinary {
            get { return true; }
        }

        public override string AsString {
            get { return Convert.ToBase64String(value); }
        }

        public override string ToString() {
            return "Binary: " + value.Length;
        }

    }
}