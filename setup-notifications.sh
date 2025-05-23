#!/bin/bash

# Setup automatic notifications for Claude Code
# This adds a function to your shell that triggers notifications when commands finish

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to add to shell profile
NOTIFICATION_FUNCTION='
# Claude Code notification function
claude_notify() {
    local exit_code=$?
    if [[ -x "'$SCRIPT_DIR'/notify.sh" ]]; then
        bash "'$SCRIPT_DIR'/notify.sh" "Command finished. Ready for input!"
    fi
    return $exit_code
}

# Automatically notify when any command finishes (if it takes more than 2 seconds)
claude_auto_notify() {
    local start_time=$(date +%s)
    "$@"
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $duration -gt 2 ]]; then
        claude_notify
    fi
    return $exit_code
}

# Alias for claude command with auto-notification
alias claude-with-notify="claude_auto_notify claude"
'

# Detect shell and add to appropriate profile
if [[ "$SHELL" == */bash ]]; then
    PROFILE_FILE="$HOME/.bashrc"
elif [[ "$SHELL" == */zsh ]]; then
    PROFILE_FILE="$HOME/.zshrc"
else
    PROFILE_FILE="$HOME/.profile"
fi

echo "Adding notification functions to $PROFILE_FILE"

# Check if already added
if ! grep -q "claude_notify()" "$PROFILE_FILE" 2>/dev/null; then
    echo "" >> "$PROFILE_FILE"
    echo "# Claude Code notifications" >> "$PROFILE_FILE"
    echo "$NOTIFICATION_FUNCTION" >> "$PROFILE_FILE"
    echo "Notification functions added to $PROFILE_FILE"
    echo "Run 'source $PROFILE_FILE' or restart your terminal to enable."
    echo ""
    echo "Usage:"
    echo "  claude-with-notify    # Run claude with auto-notifications"
    echo "  claude_notify         # Manual notification trigger"
else
    echo "Notification functions already present in $PROFILE_FILE"
fi