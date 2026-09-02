# Stasis for ComfyUI

Stasis is a lightweight flow-control node that keeps an upstream branch dormant
during a normal queue and wakes it only for partial execution from a downstream
output. Its inputs are lazy, so a blocked branch is not evaluated merely because
it exists in the workflow.

Stasis was created for workflows that contain optional, expensive branches such
as model loaders, reference processing, or alternate generation paths.

## Behavior

Stasis starts enabled.

| Action | Enabled Stasis | Disabled Stasis |
| --- | --- | --- |
| Queue Prompt | Blocks the branch | Passes values through |
| Execute Selected Output Nodes | Passes values through | Passes values through |

Click the node's **Disabled** toggle to turn Stasis behavior off and use it as a
regular pass-through node. The setting is saved with the workflow.

## Lanes

- Accepts any ComfyUI socket type.
- Starts with one input/output lane.
- Adds a new spare lane when the last visible lane is connected.
- Supports up to 16 lanes.
- Uses connected socket names such as `model`, `image`, `mask`, or `latent` as
  visible labels while keeping stable backend keys (`lane_1`, `lane_2`, etc.).

## Installation

### ComfyUI Manager / Registry

Registry installation will be available after the first public Registry release.

### Git

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/DHan315/ComfyUI-Stasis.git
```

Restart ComfyUI and refresh the browser after installation.

### ZIP

Download the repository ZIP, extract it, and place the resulting
`ComfyUI-Stasis` folder in `ComfyUI/custom_nodes/`. Restart ComfyUI afterward.

## Use

1. Add **Stasis** from the `flow control` category.
2. Connect one or more matching input/output lanes.
3. Leave Stasis enabled to keep that branch dormant during normal Queue Prompt.
4. Use **Execute Selected Output Nodes** on a downstream output to wake the
   branch for that execution.

If an older Stasis instance retains stale socket behavior after updating, remove
and re-add the node, then hard-refresh the browser.

## Requirements

- ComfyUI with lazy-input and `ExecutionBlocker` support.
- No additional Python packages.
- OS- and accelerator-independent.

## License

[MIT](LICENSE)
