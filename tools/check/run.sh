#!/bin/sh
# Runs every check on the GitHub copy: index.html built from src/, lint and dead code, the style audit,
# the word-help and FSRS (learner model) unit tests, Harbor Town's conversation check, Echo Caves' pitch and sound check, Pattern Reef's particle and mistake rules, Bottle Beach's writing feedback and the Lighthouse's signs, and the browser smoke test. Serves the site itself on a spare port while the smoke test runs.
# Usage (from the repository):  sh tools/check/run.sh
# First time: (cd tools/check && npm install && npx playwright install chromium) and pip install tinycss2
cd "$(dirname "$0")" || exit 1
ROOT=../..
PORT=${PORT:-8830}
fail=0
echo "== build";       python3 "$ROOT/tools/build.py" --check || fail=1
echo "== lint";        node lint.js || fail=1
echo "== styles";      python3 css_audit.py || fail=1
echo "== word help";   out=$(node "$ROOT/tools/words/test_words.js") || { echo "$out"; fail=1; }; echo "$out" | tail -1   # (a pipe into tail used to hide a failure)
echo "== learner";     out=$(node test_fsrs.js) || { echo "$out"; fail=1; }; echo "$out" | tail -1
echo "== town";        out=$(node test_town.js) || { echo "$out"; fail=1; }; echo "$out" | tail -1
echo "== caves";       out=$(node test_caves.js) || { echo "$out"; fail=1; }; echo "$out" | tail -1
echo "== patterns";    out=$(node test_patterns.js) || { echo "$out"; fail=1; }; echo "$out" | tail -1
echo "== beach";       out=$(node test_beach.js) || { echo "$out"; fail=1; }; echo "$out" | tail -1
echo "== browser";
( cd "$ROOT" && exec python3 -m http.server "$PORT" >/dev/null 2>&1 ) & SERVER=$!
sleep 1
node smoke.js "$PORT" || fail=1
kill "$SERVER" 2>/dev/null
[ "$fail" = 0 ] && echo "ALL CHECKS PASSED" || echo "SOME CHECKS FAILED"
exit "$fail"
