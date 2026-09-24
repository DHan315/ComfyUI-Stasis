import { app } from "../../scripts/app.js";

const NODE_TYPE = "Stasis";
const MAX_LANES = 16;
const DISABLED_WIDGET = "disabled";
const PARTIAL_WIDGET = "partial_execute";

function findWidget(node, name) {
    return node?.widgets?.find((w) => w.name === name);
}

function graph() {
    return app.rootGraph ?? app.graph;
}

function getLink(linkId) {
    return graph()?.links?.[linkId] ?? app.graph?.links?.[linkId] ?? null;
}

function getNode(nodeId) {
    return graph()?.getNodeById?.(nodeId) ?? app.graph?.getNodeById?.(nodeId) ?? null;
}

function inputConnected(input) {
    return input?.link != null;
}

function outputConnected(output) {
    return Array.isArray(output?.links) && output.links.length > 0;
}

function laneCount(node) {
    return Math.max(node.inputs?.length ?? 0, node.outputs?.length ?? 0);
}

function cleanLabel(value) {
    if (value == null) return "";
    let label = String(value).trim();

    if (!label || label === "*" || /^lane[_ ]\d+$/i.test(label)) return "";

    label = label.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    if (label.length > 22) label = `${label.slice(0, 19)}…`;
    return label;
}

function inferInputLabel(node, index) {
    const input = node.inputs?.[index];
    if (!inputConnected(input)) return "";

    const link = getLink(input.link);
    const originNode = link ? getNode(link.origin_id) : null;
    const originOutput = originNode?.outputs?.[link?.origin_slot];

    return (
        cleanLabel(originOutput?.label) ||
        cleanLabel(originOutput?.name) ||
        cleanLabel(originOutput?.type) ||
        cleanLabel(input?.type)
    );
}

function inferOutputLabel(node, index) {
    const output = node.outputs?.[index];
    const linkId = output?.links?.[0];
    if (linkId == null) return "";

    const link = getLink(linkId);
    const targetNode = link ? getNode(link.target_id) : null;
    const targetInput = targetNode?.inputs?.[link?.target_slot];

    return (
        cleanLabel(targetInput?.label) ||
        cleanLabel(targetInput?.name) ||
        cleanLabel(targetInput?.type) ||
        cleanLabel(output?.type)
    );
}

function connectedType(node, index) {
    const input = node.inputs?.[index];

    if (inputConnected(input)) {
        const link = getLink(input.link);
        const originNode = link ? getNode(link.origin_id) : null;
        const originOutput = originNode?.outputs?.[link?.origin_slot];
        if (originOutput?.type) return originOutput.type;
    }

    const output = node.outputs?.[index];
    const linkId = output?.links?.[0];

    if (linkId != null) {
        const link = getLink(linkId);
        const targetNode = link ? getNode(link.target_id) : null;
        const targetInput = targetNode?.inputs?.[link?.target_slot];
        if (targetInput?.type) return targetInput.type;
    }

    return "*";
}

function refreshLaneLabels(node) {
    const count = laneCount(node);

    for (let index = 0; index < count; index++) {
        const input = node.inputs?.[index];
        const output = node.outputs?.[index];
        if (!input || !output) continue;

        const connected = inputConnected(input) || outputConnected(output);
        const inferred = inferInputLabel(node, index) || inferOutputLabel(node, index);
        const visibleLabel = connected && inferred ? inferred : `lane ${index + 1}`;
        const type = connected ? connectedType(node, index) : "*";

        // IMPORTANT: Keep .name stable as lane_1, lane_2, etc. ComfyUI uses
        // those names as backend prompt keys. Only .label changes visually.
        input.name = `lane_${index + 1}`;
        output.name = `lane_${index + 1}`;
        input.label = visibleLabel;
        output.label = visibleLabel;
        input.type = type;
        output.type = type;
    }

    app.canvas?.setDirty?.(true, true);
}

function addLane(node) {
    const next = laneCount(node) + 1;
    if (next > MAX_LANES) return;

    node.addInput(`lane_${next}`, "*");
    node.addOutput(`lane_${next}`, "*");

    const index = next - 1;
    node.inputs[index].label = `lane ${next}`;
    node.outputs[index].label = `lane ${next}`;
}

function removeLastLane(node) {
    const count = laneCount(node);
    if (count <= 1) return;

    node.removeInput(count - 1);
    node.removeOutput(count - 1);
}

function normalizeLanes(node) {
    if (!node.inputs?.length || !node.outputs?.length) {
        while (node.inputs?.length) node.removeInput(node.inputs.length - 1);
        while (node.outputs?.length) node.removeOutput(node.outputs.length - 1);
        addLane(node);
    }

    // Keep exactly one empty spare lane after the last used lane.
    while (laneCount(node) < MAX_LANES) {
        const last = laneCount(node) - 1;
        const lastUsed =
            inputConnected(node.inputs?.[last]) ||
            outputConnected(node.outputs?.[last]);

        if (!lastUsed) break;
        addLane(node);
    }

    while (laneCount(node) > 1) {
        const count = laneCount(node);
        const last = count - 1;
        const previous = count - 2;

        const lastUsed =
            inputConnected(node.inputs?.[last]) ||
            outputConnected(node.outputs?.[last]);

        const previousUsed =
            inputConnected(node.inputs?.[previous]) ||
            outputConnected(node.outputs?.[previous]);

        if (lastUsed || previousUsed) break;
        removeLastLane(node);
    }

    refreshLaneLabels(node);
    node.setSize(node.computeSize());
    app.canvas?.setDirty?.(true, true);
}

function hideWidget(widget) {
    if (!widget) return;
    widget.hidden = true;
    widget.computeSize = () => [0, -4];
    widget.type = "hidden";
}

function refreshTitle(node) {
    const disabled = Boolean(findWidget(node, DISABLED_WIDGET)?.value);
    node.title = disabled ? "DHan-Stasis (Disabled)" : "❄ DHan-Stasis";
    node.properties ??= {};
    node.properties.stasis_disabled = disabled;
    app.canvas?.setDirty?.(true, false);
}

function configureToggle(node) {
    const disabled = findWidget(node, DISABLED_WIDGET);
    if (!disabled) return;

    disabled.label = "Disabled";

    const originalCallback = disabled.callback;
    disabled.callback = (...args) => {
        const result = originalCallback?.apply(disabled, args);
        refreshTitle(node);
        return result;
    };
}

function configurePartialExecution(node) {
    const partial = findWidget(node, PARTIAL_WIDGET);
    if (!partial) return;

    partial.value = false;
    hideWidget(partial);

    partial.beforeQueued = ({ isPartialExecution } = {}) => {
        partial.value = Boolean(isPartialExecution);

        // Reset after graphToPrompt has serialized the current execution.
        window.setTimeout(() => {
            partial.value = false;
        }, 400);
    };

    partial.serializeValue = function () {
        return Boolean(this.value);
    };
}

app.registerExtension({
    name: "dae.stasis.v6",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== NODE_TYPE) return;

        const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
        const originalOnConfigure = nodeType.prototype.onConfigure;
        const originalOnConnectionsChange = nodeType.prototype.onConnectionsChange;

        nodeType.prototype.onNodeCreated = function () {
            const result = originalOnNodeCreated?.apply(this, arguments);

            while (this.inputs?.length) this.removeInput(this.inputs.length - 1);
            while (this.outputs?.length) this.removeOutput(this.outputs.length - 1);
            addLane(this);

            configureToggle(this);
            configurePartialExecution(this);
            refreshTitle(this);
            normalizeLanes(this);

            return result;
        };

        nodeType.prototype.onConfigure = function () {
            const result = originalOnConfigure?.apply(this, arguments);

            configureToggle(this);
            configurePartialExecution(this);

            const highestUsedInput =
                (this.inputs ?? []).reduce(
                    (highest, input, index) =>
                        inputConnected(input) ? Math.max(highest, index) : highest,
                    -1
                );

            const highestUsedOutput =
                (this.outputs ?? []).reduce(
                    (highest, output, index) =>
                        outputConnected(output) ? Math.max(highest, index) : highest,
                    -1
                );

            const required = Math.min(
                MAX_LANES,
                Math.max(1, highestUsedInput + 2, highestUsedOutput + 2)
            );

            while ((this.inputs?.length ?? 0) < required) addLane(this);

            window.setTimeout(() => {
                normalizeLanes(this);
                refreshTitle(this);
            }, 0);

            return result;
        };

        nodeType.prototype.onConnectionsChange = function () {
            const result = originalOnConnectionsChange?.apply(this, arguments);
            window.setTimeout(() => normalizeLanes(this), 0);
            return result;
        };
    },
});
