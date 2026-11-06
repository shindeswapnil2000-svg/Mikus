# Local generative AI setup

## Runtime

Mikus integrates the Android `AiChat` / `InferenceEngine` binding maintained in the upstream `ggml-org/llama.cpp` repository under `examples/llama.android/lib`. The build helper fetches that repository into `native/llama.cpp` and configures it as the `:llama-lib` Gradle module. This avoids checking a second large native source tree into the Mikus repository.

References:
- llama.cpp Android documentation: https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md
- Android binding: https://github.com/ggml-org/llama.cpp/tree/master/examples/llama.android
- Upstream API: `AiChat.getInferenceEngine`, `InferenceEngine.loadModel`, `setSystemPrompt`, `sendUserPrompt`.

## Suggested model

- Publisher: Qwen
- Repository: https://huggingface.co/Qwen/Qwen3-4B-GGUF
- File/quantization: `Q4_K_M` (~2.5 GB)
- License: Apache-2.0 according to the model card at time of writing.

A 4B Q4 model is a reasonable quality/memory compromise for a current flagship Android phone. It still needs additional RAM for context, KV cache and Android itself. If the phone reports memory pressure or terminates Mikus, unload the model, reduce the context/profile, or use a smaller 1.7B/3B model supported by llama.cpp.

## Install

1. Download the `.gguf` model file in a browser on the phone or copy it from a computer.
2. Open Mikus → Settings → Choose / load GGUF model.
3. Select the file and wait for the native model to load. The file is copied to Mikus app-private storage.
4. Chat uses the loaded model. The selected model path is saved and the model is reloaded at the next app launch.
5. Use **Unload model** to release native memory.

No model is automatically downloaded by the app. No cloud fallback exists. A missing model means the deterministic local assistant rules remain active.

## Profiles and personas

Personas change the local model's system prompt. Quick/Balanced/Deep select 256/512/1024 maximum generated tokens. These are generation limits, not separate models. The local retrieval component supplies up to eight relevant recent conversation/document passages to the current request.
