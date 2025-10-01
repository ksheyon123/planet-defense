import * as BABYLON from "@babylonjs/core";

// 최소한의 공통 기능만
export class BaseObject {
  protected mesh: BABYLON.Mesh;
  protected scene: BABYLON.Scene;
  protected _isActive: boolean = true;

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene) {
    this.mesh = mesh;
    this.scene = scene;
  }

  public getMesh(): BABYLON.Mesh {
    return this.mesh;
  }
  public getPosition(): BABYLON.Vector3 {
    return this.mesh.position;
  }
  public isActive(): boolean {
    return this._isActive;
  }

  public update(deltaTime: number): void {
    // 하위 클래스에서 override
  }

  public dispose(): void {
    this.mesh.dispose();
  }
}

// 움직이는 객체만
export class MovableObject extends BaseObject {
  protected speed: number;
  protected velocity: BABYLON.Vector3;

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.1) {
    super(mesh, scene);
    this.speed = speed;
    this.velocity = new BABYLON.Vector3(0, 0, 0);
  }

  protected move(direction: BABYLON.Vector3, deltaTime: number): void {
    if (direction.length() > 0) {
      direction.normalize();
      this.mesh.position.addInPlace(direction.scale(this.speed * deltaTime));
    }
  }
}

type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
};

// 입력을 받는 객체만
export class ControllableObject extends MovableObject {
  protected inputState: InputState;

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.1) {
    super(mesh, scene, speed);
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };
  }

  public updateInput(key: string, isPressed: boolean): void {
    switch (key.toLowerCase()) {
      case "w":
        this.inputState.forward = isPressed;
        break;
      case "s":
        this.inputState.backward = isPressed;
        break;
      case "a":
        this.inputState.left = isPressed;
        break;
      case "d":
        this.inputState.right = isPressed;
        break;
      case "shift":
        this.inputState.sprint = isPressed;
        break;
    }
  }
}
