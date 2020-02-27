using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonDouble: BonValue {
        public double value;
        public BonDouble() {
        }
        public BonDouble(double v) {
            value = v;
        }

        public override bool AsBoolean {
            get { return value != 0.0; }
        }

        public override double AsDouble {
            get { return value; }
        }

        public override int AsInt {
            get { return (int)value; }
        }

        public override float AsFloat {
            get { return (float)value; }
        }

        public override long AsLong {
            get { return (long)value; }
        }

        public override string AsString => value.ToString();

        public override DateTime AsDateTime => UTC_ZERO.AddMilliseconds(value);

        public override bool IsDouble {
            get { return true; }
        }


    }
}