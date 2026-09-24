import importlib.util
import pathlib
import sys
import types
import unittest


class ExecutionBlocker:
    def __init__(self, message):
        self.message = message


def load_node_module():
    graph = types.ModuleType("comfy_execution.graph")
    graph.ExecutionBlocker = ExecutionBlocker
    package = types.ModuleType("comfy_execution")
    package.graph = graph
    sys.modules["comfy_execution"] = package
    sys.modules["comfy_execution.graph"] = graph

    root = pathlib.Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("stasis_node", root / "__init__.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


stasis_node = load_node_module()


class StasisTests(unittest.TestCase):
    def setUp(self):
        self.node = stasis_node.Stasis()

    def test_closed_stasis_requests_no_lazy_inputs(self):
        missing = self.node.check_lazy_status(
            disabled=False,
            partial_execute=False,
            lane_1=None,
            lane_2=None,
        )
        self.assertEqual(missing, [])

    def test_open_stasis_requests_only_missing_lanes(self):
        missing = self.node.check_lazy_status(
            disabled=True,
            partial_execute=False,
            lane_1=None,
            lane_2="ready",
        )
        self.assertEqual(missing, ["lane_1"])

    def test_closed_stasis_blocks_all_outputs(self):
        outputs = self.node.stasis(
            disabled=False,
            partial_execute=False,
            lane_1="should not pass",
        )
        self.assertEqual(len(outputs), stasis_node.MAX_LANES)
        self.assertTrue(all(isinstance(value, ExecutionBlocker) for value in outputs))

    def test_disabled_stasis_passes_values(self):
        outputs = self.node.stasis(
            disabled=True,
            partial_execute=False,
            lane_1="model",
            lane_2="clip",
        )
        self.assertEqual(outputs[:3], ("model", "clip", None))

    def test_partial_execution_passes_values(self):
        outputs = self.node.stasis(
            disabled=False,
            partial_execute=True,
            lane_1="image",
        )
        self.assertEqual(outputs[0], "image")

    def test_public_comfyui_contract(self):
        self.assertIs(stasis_node.NODE_CLASS_MAPPINGS["Stasis"], stasis_node.Stasis)
        self.assertEqual(stasis_node.NODE_DISPLAY_NAME_MAPPINGS["Stasis"], "Comfyui-DHan-Stasis")
        self.assertEqual(stasis_node.WEB_DIRECTORY, "./js")


if __name__ == "__main__":
    unittest.main()

