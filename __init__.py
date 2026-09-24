from comfy_execution.graph import ExecutionBlocker


class AnyType(str):
    """Wildcard socket type compatible with ComfyUI type matching."""

    def __ne__(self, _other):
        return False


ANY = AnyType("*")
MAX_LANES = 16


class Stasis:
    """
    Enabled (default):
      - Normal Queue Prompt: block this branch
      - Execute Selected Output Nodes: pass connected values

    Disabled:
      - Always pass connected values

    Inputs are lazy, so enabled Stasis avoids evaluating blocked upstream lanes.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "disabled": (
                    "BOOLEAN",
                    {
                        "default": False,
                        "label_on": "DISABLED",
                        "label_off": "ENABLED",
                    },
                ),
                # Controlled automatically by the frontend and hidden from view.
                "partial_execute": (
                    "BOOLEAN",
                    {
                        "default": False,
                        "label_on": "PARTIAL",
                        "label_off": "NORMAL",
                    },
                ),
            },
            "optional": {
                "lane_1": (ANY, {"lazy": True}),
                "lane_2": (ANY, {"lazy": True}),
                "lane_3": (ANY, {"lazy": True}),
                "lane_4": (ANY, {"lazy": True}),
                "lane_5": (ANY, {"lazy": True}),
                "lane_6": (ANY, {"lazy": True}),
                "lane_7": (ANY, {"lazy": True}),
                "lane_8": (ANY, {"lazy": True}),
                "lane_9": (ANY, {"lazy": True}),
                "lane_10": (ANY, {"lazy": True}),
                "lane_11": (ANY, {"lazy": True}),
                "lane_12": (ANY, {"lazy": True}),
                "lane_13": (ANY, {"lazy": True}),
                "lane_14": (ANY, {"lazy": True}),
                "lane_15": (ANY, {"lazy": True}),
                "lane_16": (ANY, {"lazy": True}),
            },
        }

    RETURN_TYPES = (ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY, ANY,)
    RETURN_NAMES = ("lane_1", "lane_2", "lane_3", "lane_4", "lane_5", "lane_6", "lane_7", "lane_8", "lane_9", "lane_10", "lane_11", "lane_12", "lane_13", "lane_14", "lane_15", "lane_16",)
    FUNCTION = "stasis"
    CATEGORY = "Comfyui-DHan/Flow Control"
    DESCRIPTION = (
        "Keeps a branch dormant during normal Queue Prompt. "
        "Execute Selected wakes it for that prompt. Click Disabled to turn "
        "Stasis behavior off and make it a normal pass-through."
    )

    @staticmethod
    def _is_open(disabled, partial_execute):
        return bool(disabled) or bool(partial_execute)

    def check_lazy_status(self, disabled, partial_execute, **kwargs):
        if not self._is_open(disabled, partial_execute):
            return []

        return [
            name
            for name, value in kwargs.items()
            if name.startswith("lane_") and value is None
        ]

    def stasis(self, disabled, partial_execute, **kwargs):
        if not self._is_open(disabled, partial_execute):
            blocker = ExecutionBlocker(None)
            return (blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker, blocker,)

        return (kwargs.get("lane_1"), kwargs.get("lane_2"), kwargs.get("lane_3"), kwargs.get("lane_4"), kwargs.get("lane_5"), kwargs.get("lane_6"), kwargs.get("lane_7"), kwargs.get("lane_8"), kwargs.get("lane_9"), kwargs.get("lane_10"), kwargs.get("lane_11"), kwargs.get("lane_12"), kwargs.get("lane_13"), kwargs.get("lane_14"), kwargs.get("lane_15"), kwargs.get("lane_16"),)


NODE_CLASS_MAPPINGS = {"Stasis": Stasis}
NODE_DISPLAY_NAME_MAPPINGS = {"Stasis": "DHan-Stasis"}
WEB_DIRECTORY = "./js"

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
