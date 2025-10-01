import * as BABYLON from "@babylonjs/core";
import { ControllableObject } from "./BaseObject";

export class Player extends ControllableObject {
  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.15) {
    super(mesh, scene, speed);
  }

  public update(deltaTime: number): void {
    const currentSpeed = this.inputState.sprint ? this.speed * 2 : this.speed;

    const direction = new BABYLON.Vector3(0, 0, 0);
    if (this.inputState.forward) direction.z += 1;
    if (this.inputState.backward) direction.z -= 1;
    if (this.inputState.left) direction.x -= 1;
    if (this.inputState.right) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      this.mesh.position.addInPlace(direction.scale(currentSpeed * deltaTime));
    }
  }
}
