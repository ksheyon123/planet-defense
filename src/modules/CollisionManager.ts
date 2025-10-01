// CollisionManager.ts
import * as BABYLON from "@babylonjs/core";
import { BaseObject, MovableObject } from "./BaseObject";

export interface CollisionResult {
  willCollide: boolean;
  collisionPoint?: BABYLON.Vector3;
  distance?: number;
}

export class CollisionManager {
  private collidableObjects: Map<string, BaseObject[]> = new Map();

  // 예측 설정
  private predictionSteps: number = 3; // 예측 체크 포인트 개수
  private predictionTime: number = 0.1; // 예측 시간 (초)

  constructor(predictionSteps: number = 3, predictionTime: number = 0.1) {
    this.predictionSteps = predictionSteps;
    this.predictionTime = predictionTime;
  }

  // 그룹별로 객체 등록
  public register(group: string, object: BaseObject): void {
    if (!this.collidableObjects.has(group)) {
      this.collidableObjects.set(group, []);
    }
    this.collidableObjects.get(group)!.push(object);
  }

  public unregister(group: string, object: BaseObject): void {
    const objects = this.collidableObjects.get(group);
    if (objects) {
      const index = objects.indexOf(object);
      if (index > -1) {
        objects.splice(index, 1);
      }
    }
  }

  // 예측 충돌 체크 (MovableObject용)
  public checkPredictiveCollisions(
    group1: string,
    group2: string,
    onCollision: (
      obj1: BaseObject,
      obj2: BaseObject,
      result: CollisionResult
    ) => void
  ): void {
    const objects1 = this.collidableObjects.get(group1) || [];
    const objects2 = this.collidableObjects.get(group2) || [];

    for (const obj1 of objects1) {
      if (!obj1.isActive()) continue;

      for (const obj2 of objects2) {
        if (!obj2.isActive()) continue;

        const result = this.predictCollision(obj1, obj2);
        if (result.willCollide) {
          onCollision(obj1, obj2, result);
        }
      }
    }
  }

  // 두 객체 간 예측 충돌 계산
  private predictCollision(
    obj1: BaseObject,
    obj2: BaseObject
  ): CollisionResult {
    const mesh1 = obj1.getMesh();
    const mesh2 = obj2.getMesh();

    // MovableObject인 경우 속도 정보 활용
    const velocity1 = this.getVelocity(obj1);
    const velocity2 = this.getVelocity(obj2);

    // 현재 위치에서 이미 충돌 중인지 체크
    if (mesh1.intersectsMesh(mesh2, false)) {
      return {
        willCollide: true,
        collisionPoint: mesh1.position.clone(),
        distance: 0,
      };
    }

    // 예측 경로를 여러 구간으로 나눠서 체크
    for (let step = 1; step <= this.predictionSteps; step++) {
      const t = (step / this.predictionSteps) * this.predictionTime;

      // 예측 위치 계산
      const predictedPos1 = mesh1.position.add(velocity1.scale(t));
      const predictedPos2 = mesh2.position.add(velocity2.scale(t));

      // 예측 위치에서 충돌 체크 (간단한 거리 기반)
      const distance = BABYLON.Vector3.Distance(predictedPos1, predictedPos2);
      const collisionRadius =
        this.getCollisionRadius(mesh1) + this.getCollisionRadius(mesh2);

      if (distance < collisionRadius) {
        return {
          willCollide: true,
          collisionPoint: predictedPos1.clone(),
          distance: distance,
        };
      }
    }

    return { willCollide: false };
  }

  // 특정 객체가 특정 방향으로 이동할 때 충돌 예측
  public predictMovement(
    obj: BaseObject,
    direction: BABYLON.Vector3,
    speed: number,
    deltaTime: number,
    checkGroup: string
  ): CollisionResult {
    const checkObjects = this.collidableObjects.get(checkGroup) || [];
    const mesh = obj.getMesh();
    const moveVector = direction.normalize().scale(speed * deltaTime);

    // 이동 경로를 여러 지점으로 나눠서 체크
    for (let step = 1; step <= this.predictionSteps; step++) {
      const t = step / this.predictionSteps;
      const predictedPos = mesh.position.add(moveVector.scale(t));

      for (const checkObj of checkObjects) {
        if (!checkObj.isActive() || checkObj === obj) continue;

        const targetMesh = checkObj.getMesh();
        const distance = BABYLON.Vector3.Distance(
          predictedPos,
          targetMesh.position
        );
        const collisionRadius =
          this.getCollisionRadius(mesh) + this.getCollisionRadius(targetMesh);

        if (distance < collisionRadius) {
          return {
            willCollide: true,
            collisionPoint: predictedPos.clone(),
            distance: distance,
          };
        }
      }
    }

    return { willCollide: false };
  }

  // 레이캐스트 기반 예측 (빠른 투사체용)
  public raycastPrediction(
    obj: BaseObject,
    direction: BABYLON.Vector3,
    maxDistance: number,
    checkGroup: string
  ): CollisionResult {
    const mesh = obj.getMesh();
    const checkObjects = this.collidableObjects.get(checkGroup) || [];

    let closestDistance = maxDistance;
    let closestPoint: BABYLON.Vector3 | undefined;
    let willCollide = false;

    for (const checkObj of checkObjects) {
      if (!checkObj.isActive() || checkObj === obj) continue;

      const targetMesh = checkObj.getMesh();
      const ray = new BABYLON.Ray(mesh.position, direction, maxDistance);
      const pickInfo = ray.intersectsMesh(targetMesh);

      if (pickInfo.hit && pickInfo.distance < closestDistance) {
        willCollide = true;
        closestDistance = pickInfo.distance;
        closestPoint = pickInfo.pickedPoint || undefined;
      }
    }

    return {
      willCollide,
      collisionPoint: closestPoint,
      distance: willCollide ? closestDistance : undefined,
    };
  }

  // 속도 벡터 가져오기 (MovableObject인 경우)
  private getVelocity(obj: BaseObject): BABYLON.Vector3 {
    if (obj instanceof MovableObject) {
      // MovableObject의 velocity 속성 접근
      return (obj as any).velocity || BABYLON.Vector3.Zero();
    }
    return BABYLON.Vector3.Zero();
  }

  // 충돌 반경 계산 (메시 크기 기반)
  private getCollisionRadius(mesh: BABYLON.Mesh): number {
    const boundingInfo = mesh.getBoundingInfo();
    const boundingBox = boundingInfo.boundingBox;
    const extendSize = boundingBox.extendSize;

    // 바운딩 박스의 최대 크기를 반지름으로 사용
    return Math.max(extendSize.x, extendSize.y, extendSize.z);
  }

  // 모든 비활성 객체 정리
  public cleanup(): void {
    this.collidableObjects.forEach((objects, group) => {
      this.collidableObjects.set(
        group,
        objects.filter((obj) => obj.isActive())
      );
    });
  }

  // 예측 설정 변경
  public setPredictionSettings(steps: number, time: number): void {
    this.predictionSteps = steps;
    this.predictionTime = time;
  }
}
