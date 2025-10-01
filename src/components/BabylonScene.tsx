import { useEffect } from "react";
import { MeshBuilder } from "@babylonjs/core";
import { useBabylon } from "@/contexts/BabylonContext";
import * as BABYLON from "@babylonjs/core";
import { Player } from "@/modules/Player";

const BabylonScene = ({}) => {
  const { scene, isReady } = useBabylon();

  useEffect(() => {
    if (!scene || !isReady) return;

    // 간단한 구 생성
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
    sphere.position.y = 1;
    const player = new Player(sphere, scene, 1);

    // 바닥 생성
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 6, height: 6 },
      scene
    );

    scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        player.updateInput(kbInfo.event.key, true);
      } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
        player.updateInput(kbInfo.event.key, false);
      }
    });

    scene.onBeforeRenderObservable.add(() => {
      let lastTime = Date.now();
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTime) / 1000; // 초 단위
      lastTime = currentTime;

      player.update(deltaTime);
    });

    // 클린업 함수
    return () => {
      // 생성한 객체들을 제거
      sphere.dispose();
      ground.dispose();
    };
  }, [scene, isReady]);

  // Provider가 Canvas를 제공하므로 빈 div만 반환
  return null;
};

export default BabylonScene;
