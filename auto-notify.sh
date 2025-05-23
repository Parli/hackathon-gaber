#!/bin/bash

# Auto-notification wrapper for Claude Code
# This script monitors when the CLI is waiting for input and sends notifications

NOTIFY_SCRIPT="./notify.sh"

# Function to send notification
send_notification() {
    if [[ -x "$NOTIFY_SCRIPT" ]]; then
        bash "$NOTIFY_SCRIPT" "Your turn! Claude Code is waiting for input"
    fi
}

# Monitor for input prompt patterns
monitor_input() {
    local last_line=""
    
    while IFS= read -r line; do
        echo "$line"
        last_line="$line"
        
        # Check if this looks like an input prompt
        if [[ "$line" =~ ^\$ ]] || [[ "$line" =~ Human:.*$ ]] || [[ "$line" == *"$"* && ${#line} -lt 10 ]]; then
            # Wait a moment to ensure the prompt is stable
            sleep 0.5
            send_notification
        fi
    done
}

# If running with arguments, pass them through to the original command
if [[ $# -gt 0 ]]; then
    "$@" | monitor_input
else
    echo "Usage: $0 <command to monitor>"
    echo "Example: $0 claude-code"
fi