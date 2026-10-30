/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `1` / `true` / `yes` / `on` → mount Godot iframe on shore. Default unset = Web WalkLayer only. */
  readonly VITE_GODOT_SHORE?: string;
  /** iframe src; default `/godot/`. Local bypass e.g. `http://47.252.94.138/godot/`. */
  readonly VITE_GODOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
