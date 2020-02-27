using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonLong: BonValue {
        public long value;
        public BonLong() {
        }

        public BonLong(long v) {
            value = v;
        }

        public override bool AsBoolean {
            get { return value != 0L; }
        }

        public override double AsDouble {
            get { return value; }
        }

        public override int AsInt {
            get { return (int)value; }
        }

        public override float AsFloat {
            get { return value; }
        }

        public override long AsLong {
            get { return value; }
        }

        public override string AsString {
            get { return value.ToString(); }
        }

        public override DateTime AsDateTime => UTC_ZERO.AddMilliseconds(value);

        public override bool IsLong {
            get { return true; }
        }

    }
}