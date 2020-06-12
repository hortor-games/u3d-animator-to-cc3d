export class ExList<T> {
  private readonly factory: () => T;
  private _length: number = 0;
  private capacity: number = 0;

  public get length(): number {
    return this._length;
  }

  public set length(len: number) {
    this._length = len;
    while (this.capacity < len) {
      this[this.capacity++] = this.factory();
    }
  }

  reset() {
    this._length = 0;
  }

  constructor(factory: () => T) {
    this.factory = factory;
  }

  add(v: T) {
    this[this.length++] = v;
  }

  forEach(callbackfn: (value: T, index?: number) => boolean | void, thisArg?: any) {
    for (let i = 0; i < this._length; i++) {
      if (callbackfn.call(thisArg, this[i], i) === false) {
        return;
      }
    }
  }
}