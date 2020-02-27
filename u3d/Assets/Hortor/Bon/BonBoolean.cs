using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonBoolean: BonValue {
        public bool value;
        public BonBoolean() {
        }

        public BonBoolean(bool v) {
            value = v;
        }

        public override bool AsBoolean {
            get { return value; }
        }

        public override double AsDouble {
            get { return value ? 1.0 : 0.0; }
        }

        public override int AsInt {
            get { return value ? 1 : 0; }
        }

        public override float AsFloat {
            get { return value ? 1f : 0f; }
        }

        public override long AsLong {
            get { return value ? 1L : 0L; }
        }

        public override string AsString {
            get { return value ? "true" : "false"; }
        }

        public override bool IsBoolean {
            get { return true; }
        }

    }
}