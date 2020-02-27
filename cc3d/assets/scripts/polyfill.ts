import {Component, Scene, Vec3, Node, Director, Asset} from "cc";

declare module "cc" {

  interface Node {
    getComponentInParent<T extends Component>(type: { prototype: T }): T;

    getComponentsInParent<T extends Component>(type: { prototype: T }): T[];
  }

  interface Director {
    getCurrentTimeS(): number;
  }

  interface Asset {
    bytes(): ArrayBuffer;
  }
}


Node.prototype.getComponentInParent = function <T extends Component>(type: { prototype: T }): T {
  let t;
  let node = this;
  while (!(t = node.getComponent(type)) && (node = node.parent) && !(node instanceof cc.Scene)) {
  }
  return t;
};

Node.prototype.getComponentsInParent = function <T extends Component>(type: { prototype: T }): T[] {
  let ts: T[] = [];
  let node = this;
  do {
    let t = node.getComponent(type);
    t && ts.push(t);
  } while ((node = node.parent) && !(node instanceof Scene));
  return ts;
};

Director.prototype.getCurrentTimeS = function (): number {
  return this.getCurrentTime() / 1000;
};

Asset.prototype.bytes = function (): ArrayBuffer {
  return this["_file"];
};

(<any>Vec3).prototype.setValue = function (v: Vec3) {
  this.set(v);
}
