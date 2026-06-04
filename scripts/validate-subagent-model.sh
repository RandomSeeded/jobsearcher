#!/usr/bin/env bash
# Validates that CLAUDE_CODE_SUBAGENT_MODEL controls subagent model selection.
# No web searches — cheap to run. Uses --output-format json to extract modelUsage.
set -euo pipefail

PROMPT='Use the Agent tool to spawn exactly one subagent. The subagent prompt must be exactly: "Reply with the single word DONE and nothing else." Do not do anything else.'

extract_models() {
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data:
    if item.get('type') == 'result' and 'modelUsage' in item:
        for model, usage in item['modelUsage'].items():
            print(f'  {model}: {usage[\"inputTokens\"]}in / {usage[\"outputTokens\"]}out')
    # Also catch subagent result events
    if item.get('type') == 'assistant':
        msg = item.get('message', {})
        model = msg.get('model', '')
        if model:
            print(f'  (api call) model: {model}')
" 2>/dev/null | sort -u
}

echo "=== WITHOUT CLAUDE_CODE_SUBAGENT_MODEL ==="
OUT_WITHOUT=$(claude -p "$PROMPT" \
  --model haiku \
  --allowedTools Agent \
  --output-format json \
  --verbose 2>&1)
echo "$OUT_WITHOUT" | extract_models

echo ""
echo "=== WITH CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-4-5-20251001 ==="
OUT_WITH=$(CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-4-5-20251001 claude -p "$PROMPT" \
  --model haiku \
  --allowedTools Agent \
  --output-format json \
  --verbose 2>&1)
echo "$OUT_WITH" | extract_models

echo ""
echo "=== VERDICT ==="
if echo "$OUT_WITHOUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(str(d))" 2>/dev/null | grep -qi sonnet; then
  echo "CONFIRMED: without env var, sonnet appeared in subagent calls"
else
  echo "NOTE: sonnet not detected without env var (subagent may have inherited haiku from parent)"
fi

if echo "$OUT_WITH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(str(d))" 2>/dev/null | grep -qi sonnet; then
  echo "WARNING: sonnet still appeared even with CLAUDE_CODE_SUBAGENT_MODEL set"
else
  echo "CONFIRMED: with env var set, no sonnet usage detected"
fi
