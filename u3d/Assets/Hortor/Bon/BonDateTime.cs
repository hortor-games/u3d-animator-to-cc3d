using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonDateTime: BonValue {
        public DateTime value;
        public BonDateTime() {
        }

        public BonDateTime(DateTime v) {
            value = v;
        }

        public override bool AsBoolean {
            get { return value != UTC_ZERO; }
        }

        public override double AsDouble {
            get { return (value - UTC_ZERO).TotalMilliseconds; }
        }

        public override int AsInt {
            get { return (int)AsDouble; }
        }

        public override float AsFloat {
            get { return (float)AsDouble; }
        }

        public override long AsLong {
            get { return (long)AsDouble; }
        }

        public override string AsString {
            get { return value.ToString(); }
        }

        public override DateTime AsDateTime => value;

        public override bool IsDateTime {
            get { return true; }
        }


    }
}