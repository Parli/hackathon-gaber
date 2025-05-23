#!/bin/bash

# Simple notification script for WSL to Windows
# Usage: ./notify.sh "Your message here"

MESSAGE="${1:-Claude Code is ready for your input}"

# Use PowerShell to show Windows notification
powershell.exe -Command "
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

\$template = @'
<toast>
    <visual>
        <binding template=\"ToastGeneric\">
            <text>Claude Code</text>
            <text>$MESSAGE</text>
        </binding>
    </visual>
</toast>
'@

\$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
\$xml.LoadXml(\$template)
\$toast = [Windows.UI.Notifications.ToastNotification]::new(\$xml)
\$toast.Tag = 'Claude'
\$toast.Group = 'Claude'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show(\$toast)
"