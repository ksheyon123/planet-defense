# React + Babylon.js 게임 개발 아키텍처 가이드

## 목차
1. [전체 아키텍처 개요](#전체-아키텍처-개요)
2. [키보드 입력 처리](#키보드-입력-처리)
3. [GameObject 클래스 설계](#gameobject-클래스-설계)
4. [카메라 추적](#카메라-추적)
5. [성능 최적화](#성능-최적화)
6. [충돌 감지 시스템](#충돌-감지-시스템)

---

## 전체 아키텍처 개요

### 권장 프로젝트 구조

```
src/
├── contexts/
│   └── BabylonContext.tsx          # Scene, Engine 관리
├── game/
│   ├── objects/
│   │   ├── BaseObject.ts           # 기본 GameObject
│   │   ├── Player.ts               # 플레이어 클래스
│   │   └── Enemy.ts                # 적 클래스
│   ├── systems/
│   │   ├── CollisionManager.ts    # 충돌 관리
│   │   ├── ChunkManager.ts        # 청크 관리 (오픈월드)
│   │   └── LODManager.ts          # LOD 관리
│   └── types/
│       └── index.ts                # 공통 타입 정의
├── components/
│   └── GameScene.tsx               # 게임 로직 컴포넌트
└── App.tsx
```

### 핵심 아키텍처 패턴

#### 1. Context API를 통한 Scene 관리
```typescript
BabylonContext
  ├─ Scene (Babylon.js Scene 인스턴스)
  ├─ Engine (Babylon.js Engine 인스턴스)
  ├─ Canvas (HTMLCanvasElement)
  └─ isReady (초기화 완료 여부)
```

#### 2. 컴포넌트 분리 전략
```typescript
App
└─ BabylonProvider
    ├─ GameScene (게임 로직)
    ├─ InputController (입력 처리)
    └─ UIOverlay (UI 레이어)
```

---

## 키보드 입력 처리

### 문제: 이벤트 중첩

단순 `keydown` 이벤트만 사용하면:
- ❌ 키를 누르고 있어도 한 번만 실행
- ❌ 여러 키 동시 입력 불가
- ❌ Shift 같은 수식키 반영 안 됨

### 해결: 키 상태 관리 패턴

```typescript
// 1. 키 상태 객체 선언
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false
};

// 2. KEYDOWN/KEYUP으로 상태만 업데이트
scene.onKeyboardObservable.add((kbInfo) => {
  const key = kbInfo.event.key.toLowerCase();
  
  if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
    keyState[key] = true;
  } else if (kbInfo.type === KeyboardEventTypes.KEYUP) {
    keyState[key] = false;
  }
});

// 3. 렌더 루프에서 상태 확인 후 처리
scene.onBeforeRenderObservable.add(() => {
  const speed = keyState.shift ? 0.2 : 0.1;
  
  if (keyState.w) mesh.position.z += speed;
  if (keyState.s) mesh.position.z -= speed;
  if (keyState.a) mesh.position.x -= speed;
  if (keyState.d) mesh.position.x += speed;
});
```

### Scene Observable vs window.addEventListener

| 특성 | Scene Observable | window.addEventListener |
|------|-----------------|------------------------|
| 정리 | scene.dispose() 시 자동 | 수동으로 removeEventListener 필요 |
| 성능 | Babylon 렌더 루프와 동기화 | 브라우저 이벤트 루프 |
| 씬 포커스 | 씬 활성화 시만 감지 | 항상 감지 |
| 통합 | Babylon 기능과 자연스럽게 연동 | 없음 |

**권장**: Babylon 객체 제어는 Scene Observable 사용

---

## GameObject 클래스 설계

### 기본 구조

```typescript
export class BaseObject {
  protected mesh: BABYLON.Mesh;
  protected scene: BABYLON.Scene;
  protected speed: number;
  protected velocity: BABYLON.Vector3;
  
  public inputState: InputState;
  
  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.1) {
    this.mesh = mesh;
    this.scene = scene;
    this.speed = speed;
    this.velocity = new BABYLON.Vector3(0, 0, 0);
    
    this.inputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };
  }
  
  // 입력 업데이트
  public updateInput(key: string, isPressed: boolean): void {
    switch (key.toLowerCase()) {
      case 'w': this.inputState.forward = isPressed; break;
      case 's': this.inputState.backward = isPressed; break;
      case 'a': this.inputState.left = isPressed; break;
      case 'd': this.inputState.right = isPressed; break;
      case 'shift': this.inputState.sprint = isPressed; break;
    }
  }
  
  // 매 프레임 업데이트
  public update(deltaTime: number): void {
    const currentSpeed = this.inputState.sprint ? this.speed * 2 : this.speed;
    
    const direction = new BABYLON.Vector3(0, 0, 0);
    if (this.inputState.forward) direction.z += 1;
    if (this.inputState.backward) direction.z -= 1;
    if (this.inputState.left) direction.x -= 1;
    if (this.inputState.right) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize();
      this.mesh.position.addInPlace(direction.scale(currentSpeed));
    }
  }
  
  public dispose(): void {
    this.mesh.dispose();
  }
}
```

### 상속 구조

```typescript
BaseObject (기본 기능)
├─ Player (플레이어 전용 기능)
│   ├─ health, stamina 관리
│   ├─ 카메라 추적
│   └─ 입력 처리
├─ Enemy (AI 로직)
│   ├─ 타겟 추적
│   └─ 자동 이동
└─ NPC (대화, 퀘스트 등)
```

### React에서 사용

```typescript
function GameScene() {
  const { scene, engine, isReady } = useBabylon();
  const playerRef = useRef<Player | null>(null);
  
  useEffect(() => {
    if (!scene || !isReady) return;
    
    // GameObject 생성
    const playerMesh = BABYLON.MeshBuilder.CreateBox("player", {}, scene);
    const player = new Player(playerMesh, scene, 0.15);
    playerRef.current = player;
    
    // 키보드 입력
    const keyObserver = scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key;
      const isPressed = (kbInfo.type === KeyboardEventTypes.KEYDOWN);
      player.updateInput(key, isPressed);
    });
    
    // 렌더 루프
    const renderObserver = scene.onBeforeRenderObservable.add(() => {
      const deltaTime = engine.getDeltaTime() / 1000;
      player.update(deltaTime);
    });
    
    return () => {
      scene.onKeyboardObservable.remove(keyObserver);
      scene.onBeforeRenderObservable.remove(renderObserver);
      player.dispose();
    };
  }, [scene, isReady]);
}
```

---

## 카메라 추적

### 방법 1: lockedTarget (자동 추적) ⭐ 권장

```typescript
class Player extends BaseObject {
  private cameraTarget: BABYLON.TransformNode;
  
  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, speed: number = 0.1) {
    super(mesh, scene, speed);
    
    // 카메라 타겟용 TransformNode 생성
    this.cameraTarget = new BABYLON.TransformNode('cameraTarget', scene);
    this.cameraTarget.parent = this.mesh;
    this.cameraTarget.position.y = 1.5; // 플레이어 위 1.5 유닛
  }
  
  public attachCamera(camera: BABYLON.ArcRotateCamera): void {
    camera.lockedTarget = this.cameraTarget;
  }
}

// 사용
const player = new Player(playerMesh, scene, 0.15);
player.attachCamera(camera);
```

**장점**: 
- ✅ 자동으로 따라감
- ✅ 추가 코드 불필요
- ✅ 성능 최적

### 방법 2: Lerp를 통한 부드러운 추적

```typescript
class Player extends BaseObject {
  private cameraFollowSpeed: number = 0.1;
  
  public updateCameraSmooth(camera: BABYLON.ArcRotateCamera): void {
    const targetPosition = this.mesh.position.clone();
    targetPosition.y += 1.5;
    
    const currentTarget = camera.target as BABYLON.Vector3;
    camera.setTarget(
      BABYLON.Vector3.Lerp(currentTarget, targetPosition, this.cameraFollowSpeed)
    );
  }
}

// 렌더 루프에서 호출
scene.onBeforeRenderObservable.add(() => {
  player.updateCameraSmooth(camera);
});
```

**장점**:
- ✅ 시네마틱한 느낌
- ✅ 지연 효과

### 방법 3: 즉시 추적

```typescript
scene.onBeforeRenderObservable.add(() => {
  camera.setTarget(player.getPosition());
});
```

---

## 성능 최적화

### 1. Frustum Culling (기본 제공)

카메라 시야 밖의 객체 자동으로 렌더링 안 함

```typescript
// 기본적으로 활성화되어 있음
mesh.isVisible = true;
```

### 2. Level of Detail (LOD)

거리에 따라 다른 디테일의 메시 사용

```typescript
const highDetail = BABYLON.MeshBuilder.CreateSphere("high", { segments: 64 }, scene);
const mediumDetail = BABYLON.MeshBuilder.CreateSphere("medium", { segments: 32 }, scene);
const lowDetail = BABYLON.MeshBuilder.CreateSphere("low", { segments: 16 }, scene);

highDetail.addLODLevel(20, mediumDetail);  // 20 유닛 거리
highDetail.addLODLevel(50, lowDetail);     // 50 유닛 거리
highDetail.addLODLevel(100, null);         // 100 유닛 이상은 안 보임
```

### 3. Instancing (같은 메시 대량 생성)

```typescript
const box = BABYLON.MeshBuilder.CreateBox("box", { size: 1 }, scene);

// 1000개 인스턴스 생성 (매우 효율적)
for (let i = 0; i < 1000; i++) {
  const instance = box.createInstance(`box${i}`);
  instance.position = new BABYLON.Vector3(
    Math.random() * 100,
    0,
    Math.random() * 100
  );
}
```

### 4. Chunk 시스템 (오픈월드)

플레이어 주변 청크만 로드/언로드

```typescript
class ChunkManager {
  private chunks: Map<string, Chunk> = new Map();
  private renderDistance: number = 3;
  
  public update(playerPosition: BABYLON.Vector3): void {
    const chunkX = Math.floor(playerPosition.x / 50);
    const chunkZ = Math.floor(playerPosition.z / 50);
    
    // 주변 청크 로드
    for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
      for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
        const key = `${x},${z}`;
        if (!this.chunks.has(key)) {
          this.loadChunk(x, z);
        }
      }
    }
    
    // 멀리 있는 청크 언로드
    this.chunks.forEach((chunk, key) => {
      const distance = Math.max(
        Math.abs(chunk.x - chunkX),
        Math.abs(chunk.z - chunkZ)
      );
      if (distance > this.renderDistance + 1) {
        this.unloadChunk(key);
      }
    });
  }
}
```

### 5. Freeze (정적 객체 동결)

```typescript
// 움직이지 않는 객체는 동결
mesh.freezeWorldMatrix();        // Transform 계산 생략
mesh.material?.freeze();          // Material 업데이트 생략
```

### 6. Octree (공간 분할)

```typescript
// 대규모 정적 메시 관리
scene.createOrUpdateSelectionOctree(100, 2);
```

---

## 충돌 감지 시스템

### 아키텍처 선택

#### 1. GameObject 내부 관리 (소규모)
```typescript
class BaseObject {
  protected handleCollisions(): void {
    this.scene.meshes.forEach(otherMesh => {
      if (otherMesh !== this.mesh && this.mesh.intersectsMesh(otherMesh)) {
        this.onCollision(otherMesh);
      }
    });
  }
}
```

**장점**: 간단
**단점**: O(n²) 복잡도

#### 2. CollisionManager 중앙 관리 (권장)
```typescript
class CollisionManager {
  private objects: BaseObject[] = [];
  private staticColliders: BABYLON.Mesh[] = [];
  
  public update(): void {
    // 동적 vs 정적
    this.objects.forEach(obj => {
      this.staticColliders.forEach(collider => {
        if (obj.getMesh().intersectsMesh(collider)) {
          obj.onCollision(collider);
        }
      });
    });
    
    // 동적 vs 동적
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        if (this.objects[i].getMesh().intersectsMesh(this.objects[j].getMesh())) {
          this.objects[i].onCollision(this.objects[j].getMesh());
          this.objects[j].onCollision(this.objects[i].getMesh());
        }
      }
    }
  }
}
```

#### 3. Spatial Grid (대규모 게임)
```typescript
class SpatialGrid {
  private cellSize: number = 10;
  private grid: Map<string, BaseObject[]> = new Map();
  
  public getNearbyObjects(position: BABYLON.Vector3, radius: number): BaseObject[] {
    // 주변 셀만 검색
    // O(n²) → O(n * k) where k는 주변 객체 수
  }
}
```

**장점**: 
- ✅ 대규모 씬에서 효율적
- ✅ O(n * k) 복잡도

### Collision Layer & Mask 시스템

```typescript
export enum CollisionLayer {
  PLAYER = 1 << 0,      // 0001
  ENEMY = 1 << 1,       // 0010
  PROJECTILE = 1 << 2,  // 0100
  ENVIRONMENT = 1 << 3, // 1000
  ITEM = 1 << 4,        // 10000
}

class Player extends BaseObject {
  constructor() {
    super();
    
    // Player는 Player 레이어
    this.setCollisionLayer(CollisionLayer.PLAYER);
    
    // Enemy, Environment, Item과만 충돌 검사
    this.setCollisionMask(
      CollisionLayer.ENEMY | 
      CollisionLayer.ENVIRONMENT | 
      CollisionLayer.ITEM
    );
  }
}
```

### Collision 이벤트

```typescript
interface ICollidable {
  onCollisionEnter(event: CollisionEvent): void;  // 충돌 시작
  onCollisionStay(event: CollisionEvent): void;   // 충돌 중
  onCollisionExit(event: CollisionEvent): void;   // 충돌 종료
}

class Player extends BaseObject implements ICollidable {
  public onCollisionEnter(event: CollisionEvent): void {
    if (event.other instanceof Enemy) {
      this.takeDamage(10);
    } else if (event.other instanceof Item) {
      this.collectItem(event.other);
    }
  }
}
```

### 물리 엔진 사용 (고급)

```typescript
// Havok, Cannon.js, Ammo.js 등 사용 가능
const havokPlugin = new BABYLON.HavokPlugin();
scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

class PhysicsObject extends BaseObject {
  private physicsAggregate: BABYLON.PhysicsAggregate;
  
  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene) {
    super(mesh, scene);
    
    this.physicsAggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.BOX,
      { mass: 1, restitution: 0.5 },
      scene
    );
  }
}
```

**장점**:
- ✅ 실제 물리 시뮬레이션
- ✅ 중력, 마찰, 반발력 자동 처리
- ✅ 복잡한 충돌도 정확

---

## 전체 시스템 통합 예시

```typescript
// App.tsx
function App() {
  return (
    <BabylonProvider>
      <GameScene />
    </BabylonProvider>
  );
}

// GameScene.tsx
function GameScene() {
  const { scene, engine, isReady } = useBabylon();
  const playerRef = useRef<Player | null>(null);
  const collisionManagerRef = useRef<CollisionManager | null>(null);
  const chunkManagerRef = useRef<ChunkManager | null>(null);
  
  useEffect(() => {
    if (!scene || !isReady) return;
    
    // 시스템 초기화
    const collisionManager = new CollisionManager(10);
    const chunkManager = new ChunkManager(scene);
    
    collisionManagerRef.current = collisionManager;
    chunkManagerRef.current = chunkManager;
    
    // 플레이어 생성
    const playerMesh = BABYLON.MeshBuilder.CreateBox("player", {}, scene);
    const player = new Player(playerMesh, scene, 0.15);
    playerRef.current = player;
    
    // 시스템에 등록
    collisionManager.registerDynamic(player);
    
    // 카메라 연결
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
    player.attachCamera(camera);
    
    // 입력 처리
    scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.key;
      const isPressed = (kbInfo.type === KeyboardEventTypes.KEYDOWN);
      player.updateInput(key, isPressed);
    });
    
    // 메인 루프
    scene.onBeforeRenderObservable.add(() => {
      const deltaTime = engine.getDeltaTime() / 1000;
      
      player.update(deltaTime);
      collisionManager.update();
      chunkManager.update(player.getPosition());
    });
    
    return () => {
      player.dispose();
      collisionManager.dispose();
      chunkManager.dispose();
    };
  }, [scene, isReady]);
  
  return null;
}
```

---

## 베스트 프랙티스

### ✅ DO
- Context API로 Scene/Engine 관리
- 키 상태 관리 패턴 사용 (키 중첩 처리)
- Class 기반 GameObject 설계
- CollisionManager로 충돌 중앙 관리
- Spatial Grid로 충돌 최적화
- LOD, Instancing, Chunk 시스템 적용
- useEffect cleanup에서 리소스 정리

### ❌ DON'T
- keydown 이벤트만으로 이동 처리
- 전역 변수로 게임 상태 관리
- 매 프레임 모든 객체와 충돌 검사 (O(n²))
- dispose() 호출 안 함 (메모리 누수)
- 카메라를 수동으로 매 프레임 업데이트 (lockedTarget 사용)

---

## 성능 체크리스트

- [ ] Frustum Culling 활성화 (기본)
- [ ] LOD 시스템 구현
- [ ] Instancing 사용 (같은 메시 여러 개)
- [ ] Chunk 시스템 (오픈월드)
- [ ] Spatial Grid (대규모 충돌)
- [ ] Freeze 정적 객체
- [ ] Octree 설정
- [ ] Scene Optimizer 적용

---

## 참고 자료

- [Babylon.js 공식 문서](https://doc.babylonjs.com/)
- [Babylon.js Playground](https://playground.babylonjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React 공식 문서](https://react.dev/)

---

## 라이센스 및 기여

이 가이드는 학습 목적으로 작성되었습니다. 
자유롭게 사용하고 개선해주세요!