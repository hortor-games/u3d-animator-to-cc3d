using System;
namespace Hortor.Bon {
    public class BonException: Exception {
        private Exception cause;
        public BonException(String message)
            : base(message) {
        }

        public BonException(Exception t)
            : base(t.Message) {
            this.cause = t;
        }

        public Exception GetCause() {
            return this.cause;
        }
    }
}