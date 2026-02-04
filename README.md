# LLM-Structured-Output-Reliability-Evaluation
## Abstract

This project presents a controlled experimental evaluation of large language model (LLM) APIs in a deterministic navigation setting. The study compares Google Gemini (Gemini 2.5 Flash Lite) and DeepSeek (via Hugging Face Router) within a custom-built 3D Memory Maze environment. Unlike traditional text-based benchmarks, this evaluation focuses on structured action generation under strict formatting constraints. Each model is required to produce a valid JSON object containing navigation commands without additional explanation, retries, or corrective intervention. The results demonstrate measurable differences in formatting compliance and execution reliability across models.

---

## Introduction

Contemporary large language models are increasingly integrated into systems that require structured action generation rather than free-form text production. Applications such as planning systems, routing engines, robotics control pipelines, and API-based automation frameworks depend on outputs that are syntactically valid and machine-executable. In such systems, even minor deviations from required formats may cause complete operational failure.

Standard evaluation benchmarks emphasize reasoning, comprehension, and generative fluency. However, they rarely assess performance in environments where output must conform to strict structural requirements. This project addresses that limitation by introducing a controlled Memory Maze environment in which models must translate spatial descriptions into executable commands. The system eliminates fallback logic, error correction, and retries to expose the true reliability of model outputs.

---

## Experimental Environment

The experiment is conducted within a 3D simulation developed using the AncientBrain platform and Three.js. The maze structure is generated using a deterministic depth-first search (DFS) algorithm to ensure reproducibility. Each maze is grid-based and bounded by walls, with a defined start position and a target cell represented visually within the environment.

Maze configurations include:

* Grid sizes: 10×10, 15×15, and 20×20
* Three deterministic presets per size
* Identical start orientation (agent begins facing East)

Each model receives:

* Full maze configuration in JSON format
* Start and target coordinates
* A concise instruction (e.g., “Go to the red hole”)

The task is to return a strictly formatted JSON object of the form:

```json
{"commands":["FORWARD","LEFT","RIGHT"]}
```

Only the commands FORWARD, LEFT, and RIGHT are permitted. Any deviation in formatting, structure, or additional prose may result in parsing failure and prevent agent movement.

---

## Methodology

The experimental design ensures strict parity between models:

1. Both models receive identical input data.
2. Only a single API call is made per test case.
3. No response cleaning or correction mechanisms are applied.
4. Commands are executed sequentially and literally.
5. The simulation terminates when:

   * The agent reaches the goal, or
   * All commands are exhausted.

The system tracks move validity and final outcomes. A command is considered valid if it produces a legitimate state transition (e.g., successful forward movement or orientation change). Collisions with walls are recorded but do not alter position.

Accuracy is calculated as:

valid_moves / total_moves

The evaluation thus distinguishes between formatting compliance and effective navigation performance.

---

## Models Evaluated

The following APIs are compared:

* Google Gemini (gemini-2.5-flash-lite)
* DeepSeek (DeepSeek-V3.2-Exp via Hugging Face Router)

Both models are assessed under identical environmental constraints and prompt conditions.

---

## Results and Interpretation

The controlled evaluation reveals significant differences in structured output reliability. Gemini demonstrates consistent adherence to strict JSON formatting requirements and more frequent successful navigation to the target cell. In contrast, DeepSeek exhibits higher variability in response structure, often introducing additional text or formatting inconsistencies that prevent successful parsing.

Failures in this environment are immediately visible and quantifiable. Unlike text-based benchmarks where errors may remain implicit, structural deviations in this system directly halt execution. The experiment highlights the importance of output discipline in real-world AI deployment scenarios where formatting correctness is critical.

The findings suggest that reliable navigation in deterministic environments depends not only on reasoning capability but also on consistent structural compliance.

---

## System Components

The implementation consists of:

* Deterministic DFS-based maze generator
* Grid-to-world coordinate mapping system
* Dual-agent simultaneous execution framework
* Strict JSON parsing and validation logic
* Move-level accuracy tracking
* Real-time performance comparison interface

The design ensures reproducibility and clear attribution of success or failure to formatting discipline and command validity.

---

## Conclusion

This project demonstrates that structured output reliability varies significantly across LLM APIs when evaluated in deterministic, execution-critical environments. While models may exhibit strong reasoning capabilities in conversational contexts, adherence to strict structural constraints presents a distinct challenge.

The Memory Maze environment provides a transparent and measurable framework for assessing these differences. By removing fallback mechanisms and retries, the experiment isolates model behavior under strict operational conditions. The results underscore the necessity of evaluating LLMs not only for reasoning fluency but also for formatting discipline and execution consistency.

---

## Security Notice

API keys are not stored within this repository. Users must supply their own credentials securely when running the system.
