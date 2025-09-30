import * as BABYLON from "@babylonjs/core";

// 입력 상태 인터페이스
interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
}

// GameObject 기본 클래스
export class BaseObject {
  protected mesh: BABYLON.Mesh;
  protected scene: BABYLON.Scene;
  protected speed: number;
  protected velocity: BABYLON.Vector3;
  protected isRunning: boolean;

  // 입력 상태
  public inputState: InputState;

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.1) {
    this.mesh = mesh;
    this.scene = scene;
    this.speed = speed;
    this.isRunning = false;

    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };

    this.velocity = new BABYLON.Vector3(0, 0, 0);
  }

  // 입력 업데이트
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
      case " ":
        this.inputState.jump = isPressed;
        break;
    }
  }

  // 매 프레임 업데이트
  public update(deltaTime: number): void {
    // 속도 계산
    const currentSpeed = this.inputState.sprint ? this.speed * 2 : this.speed;

    // 방향 계산
    const direction = new BABYLON.Vector3(0, 0, 0);
    if (this.inputState.forward) direction.z += 1;
    if (this.inputState.backward) direction.z -= 1;
    if (this.inputState.left) direction.x -= 1;
    if (this.inputState.right) direction.x += 1;

    // 이동 적용
    if (direction.length() > 0) {
      direction.normalize();
      this.mesh.position.addInPlace(direction.scale(currentSpeed));
    }
  }

  // Getter 메서드들
  public getMesh(): BABYLON.Mesh {
    return this.mesh;
  }

  public getPosition(): BABYLON.Vector3 {
    return this.mesh.position.clone();
  }

  public setPosition(position: BABYLON.Vector3): void {
    this.mesh.position = position;
  }

  public getRotation(): BABYLON.Vector3 {
    return this.mesh.rotation.clone();
  }

  public setRotation(rotation: BABYLON.Vector3): void {
    this.mesh.rotation = rotation;
  }

  // 리소스 정리
  public dispose(): void {
    this.mesh.dispose();
  }
}
