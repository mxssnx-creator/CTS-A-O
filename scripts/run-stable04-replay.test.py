"""The exploratory launcher must never silently run a different frozen window."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('stable04_replay', Path(__file__).with_name('run-stable04-replay.py'))
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)


class LaunchBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.out = Path(self.tmp.name)
        (self.out / 'settings.json').write_text('{}')
        (self.out / 'wf.json').write_text('{}')

    def freeze(self, staged):
        window = {
            'evaluationFromT': 1791925200000 if staged else 1792011600000,
            'tradeStartT': 1792011600000 if staged else 1792098000000,
            'endT': 1792184400000, 'preH': 24, 'runH': 48 if staged else 24,
        }
        (self.out / 'protocol.json').write_text(json.dumps({
            'window': window, 'policy': {'targetWindow': {}} if staged else {},
        }))

    def test_each_mode_launches_its_own_window_offline(self):
        for staged, hours, evaluation in ((False, '24', '2026-10-14T21:00:00.000Z'),
                                          (True, '48', '2026-10-13T21:00:00.000Z')):
            with self.subTest(staged=staged):
                self.freeze(staged)
                with patch.object(replay.subprocess, 'Popen', side_effect=RuntimeError('intercept')) as process:
                    with self.assertRaisesRegex(RuntimeError, 'intercept'):
                        replay.main(self.out, staged)
                args = process.call_args.args[0]
                env = process.call_args.kwargs['env']
                self.assertEqual(args[args.index('--run') + 1], hours)
                self.assertEqual(args[args.index('--pre') + 1], '24')
                self.assertEqual(args[args.index('--evaluation-from') + 1], evaluation)
                self.assertEqual(env['CTS_CORE_LIVE'], '0')
                self.assertIn('core-test-offline-guard.cjs', env['NODE_OPTIONS'])

    def test_refuses_mismatched_or_modified_window_before_launch(self):
        self.freeze(True)
        with patch.object(replay.subprocess, 'Popen') as process:
            with self.assertRaisesRegex(ValueError, 'window'):
                replay.main(self.out, False)
            process.assert_not_called()
        self.freeze(False)
        protocol = json.loads((self.out / 'protocol.json').read_text())
        protocol['policy']['targetWindow'] = {}
        (self.out / 'protocol.json').write_text(json.dumps(protocol))
        with patch.object(replay.subprocess, 'Popen') as process:
            with self.assertRaisesRegex(ValueError, 'scope'):
                replay.main(self.out, False)
            process.assert_not_called()


if __name__ == '__main__':
    unittest.main()
