import React, { useEffect, useRef } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3,
} from "@babylonjs/core";

const BabylonScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // BabylonJS 엔진 생성
    const engine = new Engine(canvasRef.current, true);
    engineRef.current = engine;

    // 씬 생성
    const scene = new Scene(engine);
    sceneRef.current = scene;

    // 카메라 생성
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      10,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);

    // 조명 생성
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // 간단한 구 생성
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
    sphere.position.y = 1;

    // 바닥 생성
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 6, height: 6 },
      scene
    );

    // 렌더 루프
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 윈도우 리사이즈 처리
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    // 클린업 함수
    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default BabylonScene;
